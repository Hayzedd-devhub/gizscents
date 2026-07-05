import { CheckoutMethod } from "@/lib/utils/constants";
import mongoose, { Schema, type Document } from "mongoose";

export interface IStoreSettingsDocument extends Document {
  storeName: string;
  logo?: {
    url: string;
    publicId: string;
  };
  favicon?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
  };
  businessHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
  themeColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  deliveryZones: {
    name: string;
    fee: number;
    estimatedDays?: string;
  }[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress?: string;
  currency: string;
  currencySymbol: string;
  categoryView: "text" | "image";
  checkoutMethod: {
    allowGuestCheckout: boolean;
    acceptOnlinePayment: boolean;
    acceptCashOnDelivery: boolean;
    acceptBankTransfer: boolean;
    acceptWhatsappOrder: boolean;
    defaultCheckoutMethod: typeof CheckoutMethod[number];
  };
  personalAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  paymentSettings: {
    activeProvider: "monnify" | "paystack" | "opay";
    monnify?: {
      apiKey: string;
      secretKey: string;
      contractCode: string;
      baseUrl: string;
    };
    paystack?: {
      secretKey: string;
      publicKey: string;
    };
    opay?: {
      publicKey: string;
      secretKey: string;
      merchantId: string;
      baseUrl: string;
    };
  };
  notificationPreferences: {
    orderNew: {
      // Subset of NOTIFICATION_METHODS values, e.g. ["email"] or ["email", "whatsapp"]
      methods: string[];
    };
  };
  heroContent?: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  heroSlides?: {
    image: {
      url: string;
      publicId: string;
    };
    mainCaption?: string;
    subCaption?: string;
  }[];
  aboutUs?: {
    title?: string;
    content?: string;
    showAboutUsPage: boolean;
  };
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettingsDocument>(
  {
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
    },
    logo: {
      url: String,
      publicId: String,
    },
    favicon: String,
    description: String,
    address: String,
    phone: String,
    email: String,
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      tiktok: String,
      youtube: String,
      whatsapp: String,
    },
    businessHours: [
      {
        day: { type: String, required: true },
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    ],
    seoMeta: {
      metaTitle: String,
      metaDescription: String,
      ogImage: String,
    },
    themeColors: {
      primary: String,
      secondary: String,
      accent: String,
    },
    deliveryZones: [
      {
        name: { type: String, required: true },
        fee: { type: Number, required: true, min: 0 },
        estimatedDays: String,
      },
    ],
    pickupEnabled: {
      type: Boolean,
      default: false,
    },
    deliveryEnabled: {
      type: Boolean,
      default: true,
    },
    pickupAddress: String,
    currency: {
      type: String,
      default: "NGN",
    },
    currencySymbol: {
      type: String,
      default: "₦",
    },
    categoryView: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    checkoutMethod: {
      allowGuestCheckout: {
        type: Boolean,
        default: true,
      },
      acceptOnlinePayment: {
        type: Boolean,
        default: false,
      },
      acceptCashOnDelivery: {
        type: Boolean,
        default: false,
      },
      acceptBankTransfer: {
        type: Boolean,
        default: false,
      },
      acceptWhatsappOrder: {
        type: Boolean,
        default: true,
      },
      defaultCheckoutMethod: {
        type: String,
        enum: [...CheckoutMethod],
        default: CheckoutMethod[0],
      },
    },
    personalAccount: {
      bankName: String,
      accountNumber: String,
      accountName: String,
    },
    paymentSettings: {
      activeProvider: {
        type: String,
        enum: ["monnify", "paystack", "opay"],
        default: "monnify",
      },
      monnify: {
        apiKey: String,
        secretKey: String,
        contractCode: String,
        baseUrl: {
          type: String,
          default: "https://sandbox.monnify.com",
        },
      },
      paystack: {
        secretKey: String,
        publicKey: String,
      },
      opay: {
        publicKey: String,
        secretKey: String,
        merchantId: String,
        baseUrl: {
          type: String,
          default: "https://sandboxapi.opaycheckout.com",
        },
      },
    },
    notificationPreferences: {
      orderNew: {
        methods: {
          type: [String],
          enum: ["email", "whatsapp"],
          default: ["email"],
        },
      },
    },
    heroContent: {
      title: String,
      subtitle: String,
      buttonText: String,
      buttonLink: String,
    },
    heroSlides: [
      {
        image: {
          url: String,
          publicId: String,
        },
        mainCaption: String,
        subCaption: String,
      },
    ],
    aboutUs: {
      title: String,
      content: String,
      showAboutUsPage: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Singleton pattern — ensure only one settings document exists.
 */
StoreSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      storeName: "My Store",
      currency: "NGN",
      currencySymbol: "₦",
      deliveryZones: [],
    });
  }
  return settings;
};

const StoreSettings =
  (mongoose.models.StoreSettings as mongoose.Model<IStoreSettingsDocument>) ||
  mongoose.model<IStoreSettingsDocument>("StoreSettings", StoreSettingsSchema);

export default StoreSettings;
