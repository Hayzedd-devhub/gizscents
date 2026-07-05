import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import Product from "@/lib/db/models/Product";
import Payment from "@/lib/db/models/Payment";
import DeliveryLocation from "@/lib/db/models/DeliveryLocation";
import { CheckoutSchema } from "@/lib/validators/order.schema";
import { paymentManager } from "@/lib/services/payment/paymentManager";
import { generateOrderNumber } from "@/lib/utils/helpers";
import { AuthService } from "@/lib/services/auth.service";
import {
  COOKIE_ACCESS_TOKEN,
  PAYMENT_CALLBACK_URL,
} from "@/lib/utils/constants";
import {
  Coupon,
  StoreSettings,
  ProductVariant,
  User,
  Guest,
  Notification,
} from "@/lib/db/models";
import mongoose from "mongoose";
import { generatePaymentReference } from "@/lib/utils/server-helpers";
import { upsertGuest } from "@/lib/auth/mergeGuest";
import { getRequestUser } from "@/lib/auth/getIdentity";
import getStoreSettings from "@/lib/settings.server";
import { EmailService } from "@/lib/services/email.service";

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await dbConnect();
    const body = await req.json();

    // Validate checkout schema
    const result = CheckoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: result.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const {
      shippingAddress,
      items,
      notes,
      couponUsed,
      isGuest,
      guestEmail,
      guestPhone,
    } = result.data;

    await upsertGuest(req, {
      email: guestEmail,
      name: shippingAddress.fullName,
      phone: guestPhone,
    });
    // Identify user from cookie if present
    const {
      _id: userId,
      email: userEmail,
      userModel,
    } = await getRequestUser(req);

    // Recalculate and verify pricing on server

    async function verifyAndCalculateItems(items: any[]) {
      let subtotalLocal = 0;
      const verifiedItemsLocal: any[] = [];

      if (!Array.isArray(items) || items.length === 0) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, message: "No items provided" },
            { status: 400 },
          ),
          subtotal: 0,
        };
      }

      // Batch fetch products and variants to reduce DB roundtrips
      const productIds = Array.from(new Set(items.map((i) => i.productId)));
      const variantIds = Array.from(
        new Set(items.filter((i) => i.variantId).map((i) => i.variantId)),
      );

      const dbProducts = await Product.find({ _id: { $in: productIds } });
      const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

      const dbVariants = variantIds.length
        ? await ProductVariant.find({ _id: { $in: variantIds } })
        : [];
      const variantMap = new Map(dbVariants.map((v) => [v._id.toString(), v]));

      for (const item of items) {
        const prodKey = item.productId.toString();
        const dbProduct = productMap.get(prodKey);
        if (!dbProduct) {
          return {
            success: false,
            response: NextResponse.json(
              { success: false, message: `Product not found: ${item.name}` },
              { status: 400 },
            ),
            subtotal: subtotalLocal,
          };
        }

        let activePrice = dbProduct.discountPrice || dbProduct.price;
        let stockAvailable = dbProduct.stock ?? 0;
        let variantName = "";

        if (item.variantId) {
          const variantKey = item.variantId.toString();
          const dbVariant = variantMap.get(variantKey);
          if (!dbVariant || dbVariant.productId.toString() !== prodKey) {
            return {
              success: false,
              response: NextResponse.json(
                {
                  success: false,
                  message: `Variant not found or invalid: ${item.name}`,
                },
                { status: 400 },
              ),
              subtotal: subtotalLocal,
            };
          }
          if (dbVariant.price) activePrice = dbVariant.price;
          stockAvailable = dbVariant.stock ?? stockAvailable;

          // Handle attribute shapes (Map vs plain object)
          if (dbVariant.attributes) {
            if (typeof dbVariant.attributes.entries === "function") {
              variantName = Array.from(dbVariant.attributes.entries())
                .map(([k, v]) => `${k}: ${v}`)
                .join(" / ");
            } else {
              variantName = Object.entries(dbVariant.attributes || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(" / ");
            }
          }
        }

        // Check stock — respect product-level tracking and negative stock setting
        if (
          dbProduct.trackStock &&
          !dbProduct.allowNegativeStock &&
          (stockAvailable ?? 0) < item.quantity
        ) {
          return {
            success: false,
            response: NextResponse.json(
              {
                success: false,
                message: `Insufficient stock for product: ${dbProduct.name} ${variantName}`,
              },
              { status: 400 },
            ),
            subtotal: subtotalLocal,
          };
        }

        subtotalLocal += activePrice * item.quantity;

        verifiedItemsLocal.push({
          productId: dbProduct._id,
          variantId: item.variantId || undefined,
          name: variantName
            ? `${dbProduct.name} (${variantName})`
            : dbProduct.name,
          price: activePrice,
          quantity: item.quantity,
          image: dbProduct.images?.[0]?.url || item.image,
        });
      }

      return {
        success: true,
        subtotal: subtotalLocal,
        verifiedItems: verifiedItemsLocal,
      };
    }

    async function getDiscountFromCoupon(couponCode: string | undefined) {
      let discount = 0;
      if (!couponCode) {
        return {
          success: true,
          discount,
        };
      }
      const dbCoupon = await Coupon.findOne({ code: couponCode });
      if (!dbCoupon) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, message: "Coupon not found" },
            { status: 400 },
          ),
          discount: 0,
        };
      }
      if (dbCoupon.maxUses && dbCoupon.usedCount >= dbCoupon.maxUses) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, message: "Coupon has reached its maximum uses" },
            { status: 400 },
          ),
          discount: 0,
        };
      }
      const isExpired = dbCoupon.expiresAt && dbCoupon.expiresAt < new Date();
      const isStarted = dbCoupon.startsAt && dbCoupon.startsAt < new Date();
      if (!isExpired && isStarted && dbCoupon.isActive) {
        if (dbCoupon.type === "percentage") {
          discount = Math.round(subtotal * (dbCoupon.value / 100));
        } else if (dbCoupon.type === "fixed") {
          discount = dbCoupon.value;
        }
      } else {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, message: "Coupon is expired or not active" },
            { status: 400 },
          ),
          discount: 0,
        };
      }
      return {
        success: true,
        discount,
      };
    }

    async function verifyDeliveryLocation(
      deliveryLocationId: string,
      deliveryMethod: string,
    ) {
      let deliveryLocation = null;
      let deliveryFee = 0;

      deliveryLocation = await DeliveryLocation.findById(deliveryLocationId);
      if (!deliveryLocation || !deliveryLocation.isActive) {
        return {
          success: false,
          response: NextResponse.json(
            {
              success: false,
              message: "Selected delivery location is not available",
            },
            { status: 400 },
          ),
          deliveryFee,
        };
      }
      if (deliveryLocation.type !== deliveryMethod) {
        return {
          success: false,
          response: NextResponse.json(
            {
              success: false,
              message:
                "Selected delivery location does not match the chosen delivery method",
            },
            { status: 400 },
          ),
          deliveryFee,
        };
      }
      return {
        success: true,
        deliveryLocation,
        deliveryFee: deliveryLocation.price,
      };
    }

    // verify items and calculate subtotal
    const verificationResult = await verifyAndCalculateItems(items);
    if (!verificationResult.success) return verificationResult.response;

    const { subtotal, verifiedItems } = verificationResult;

    // Apply coupon discount
    const discountResult = await getDiscountFromCoupon(couponUsed);
    if (!discountResult.success) return discountResult.response;
    const { discount } = discountResult;

    // Validate selected delivery location and determine delivery fee
    const deliveryResult = await verifyDeliveryLocation(
      result.data.deliveryLocationId,
      result.data.deliveryMethod,
    );
    if (!deliveryResult.success) return deliveryResult.response;
    const { deliveryLocation, deliveryFee } = deliveryResult;

    // calculate total amount
    const total = subtotal + deliveryFee - discount;

    // Fetch settings to determine active provider
    const settings = await getStoreSettings();
    const activeProviderName =
      settings.paymentSettings?.activeProvider || "monnify";

    // Create unique order number & payment reference
    const orderNumber = generateOrderNumber();
    const paymentReference = await generatePaymentReference();

    // Create Order in DB (status: pending)
    const order = new Order({
      userId: userId || undefined,
      userModel: userModel || "User",
      orderNumber,
      items: verifiedItems,
      shippingAddress,
      subtotal,
      deliveryFee,
      deliveryMethod: result.data.deliveryMethod,
      deliveryLocationId: deliveryLocation?._id,
      discount,
      total,
      couponUsed: couponUsed || undefined,
      notes,
    });

    const payment = new Payment({
      orderId: order._id,
      userId: userId || undefined,
      reference: paymentReference,
      amount: total,
      provider: activeProviderName,
    });

    order.paymentId = payment._id;

    const method = result.data.checkoutMethod || "online";

    if (method === "pay_on_delivery") {
      order.status = "awaiting_confirmation";
    }

    await order.save({ session });
    await payment.save({ session });

    // Create admin notification
    await Notification.create(
      [
        {
          type: "order_new",
          title: "New Order Placed",
          message: `Order ${orderNumber} has been placed for ${total} NGN.`,
          metadata: {
            orderId: order._id,
            orderNumber: orderNumber,
            total: total,
          },
        },
      ],
      { session },
    );

    // Best-effort admin email alert — gated by the notificationPreferences
    // setting, sent only after the transaction commits below so we never
    // notify admins about an order that ends up rolled back.
    const notifyAdminsOfNewOrder = async () => {
      const methods = settings.notificationPreferences?.orderNew?.methods ?? [
        "email",
      ];
      if (!methods.includes("email")) return;
      try {
        const orderUser = await order.getOrderUser().catch(() => null);
        await EmailService.sendNewOrderAdminAlert(order, {
          name: orderUser?.name || shippingAddress.fullName,
          email: orderUser?.email,
        });
      } catch (error) {
        console.error("Failed to send new-order admin email:", error);
      }
    };

    // Handle different checkout methods
    if (method === "online") {
      // Initialize provider payment for online payments
      let checkoutUrl = "";
      let checkoutSuccess = false;
      try {
        const orderUser = await order.getOrderUser();
        if (!orderUser) {
          throw new Error("User not found for payment initialization");
        }
        const activeProvider = await paymentManager.getActivatedProvider();

        const paymentResult = await activeProvider.initializePayment({
          amount: total,
          customerEmail: orderUser.email || userEmail!,
          customerName: orderUser.name || shippingAddress.fullName,
          paymentReference,
          callbackUrl: PAYMENT_CALLBACK_URL,
          description: `Order ${orderNumber} payment`,
        });

        if (paymentResult.success && paymentResult.checkoutUrl) {
          checkoutUrl = paymentResult.checkoutUrl;
          checkoutSuccess = true;

          // Update payment record with provider and metadata
          payment.provider = activeProvider.name as any;
          payment.status = "pending";
          payment.metadata = paymentResult.gatewayResponse;
          await payment.save({ session });
        } else {
          throw new Error(
            paymentResult.message || "Payment initialization failed",
          );
        }
      } catch (error: any) {
        console.error("Payment provider error:", error.message);
        throw error;
      }

      if (checkoutSuccess) {
        await session.commitTransaction();
        await notifyAdminsOfNewOrder();
        return NextResponse.json({
          success: true,
          message: "Payment initialized successfully",
          paymentReference,
          checkoutUrl,
        });
      }
    } else {
      // For offline methods (pay_on_delivery, bank_transfer, whatsapp) we already created order/payment
      // Mark payment as pending/offline and return references
      payment.provider = method as any;
      payment.status = "pending";
      await payment.save({ session });
      await session.commitTransaction();
      await notifyAdminsOfNewOrder();

      if (method === "pay_on_delivery") {
        try {
          const orderUser = await order.getOrderUser();
          if (orderUser && orderUser.email) {
            await EmailService.sendOrderPlaced(
              orderUser.email,
              orderUser.name || shippingAddress.fullName,
              order,
            );
          }
        } catch (error) {
          console.error("Failed to send POD order placed email:", error);
        }
      }

      return NextResponse.json({
        success: true,
        message:
          method === "pay_on_delivery"
            ? "Order placed. Pay on delivery."
            : method === "bank_transfer"
              ? "Order placed. Please complete the bank transfer and upload evidence."
              : "Order placed. We will contact you via WhatsApp.",
        paymentReference,
      });
    }
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error("Payment initialization error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: message || "Internal server error",
        error: message,
      },
      { status: 500 },
    );
  } finally {
    session.endSession();
  }
}

export async function GET(req: NextRequest) {
  try {
    const reference = await generatePaymentReference();
    return NextResponse.json({
      success: true,
      message: "Payment reference generated successfully",
      reference,
    });
  } catch (error: unknown) {
    console.error("Payment reference generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: message || "Internal server error",
        error: message,
      },
      { status: 500 },
    );
  }
}
