import { z } from "zod";

const DeliveryZoneSchema = z.object({
  name: z.string().min(2, "Zone name is required"),
  fee: z.number().nonnegative("Fee cannot be negative"),
  estimatedDays: z.string().optional().or(z.literal("")),
});

const BusinessHourSchema = z.object({
  day: z.string(),
  open: z.string().optional().or(z.literal("")),
  close: z.string().optional().or(z.literal("")),
  isClosed: z.boolean().default(false),
});

const HeroSlideSchema = z.object({
  image: z.object({
    url: z.string().url("Invalid image URL"),
    publicId: z.string(),
  }),
  mainCaption: z.string().max(100).optional().or(z.literal("")),
  subCaption: z.string().max(200).optional().or(z.literal("")),
});

export const StoreSettingsSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  logo: z
    .object({
      url: z.string().url("Invalid logo URL"),
      publicId: z.string(),
    })
    .optional()
    .nullable(),
  favicon: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  socialLinks: z
    .object({
      facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
      instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
      twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
      tiktok: z.string().url("Invalid URL").optional().or(z.literal("")),
      youtube: z.string().url("Invalid URL").optional().or(z.literal("")),
      whatsapp: z.string().optional().or(z.literal("")),
    })
    .optional(),
  businessHours: z.array(BusinessHourSchema).optional(),
  deliveryZones: z.array(DeliveryZoneSchema).default([]),
  pickupEnabled: z.boolean().default(false),
  pickupAddress: z.string().optional().or(z.literal("")),
  seoMeta: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .optional(),
  heroSlides: z.array(HeroSlideSchema).max(5).optional(),
  paymentSettings: z
    .object({
      activeProvider: z
        .enum(["monnify", "paystack", "opay"])
        .default("monnify"),
      monnify: z
        .object({
          apiKey: z.string().optional().or(z.literal("")),
          secretKey: z.string().optional().or(z.literal("")),
          contractCode: z.string().optional().or(z.literal("")),
          baseUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
        })
        .optional(),
      paystack: z
        .object({
          secretKey: z.string().optional().or(z.literal("")),
          publicKey: z.string().optional().or(z.literal("")),
        })
        .optional(),
      opay: z
        .object({
          publicKey: z.string().optional().or(z.literal("")),
          secretKey: z.string().optional().or(z.literal("")),
          merchantId: z.string().optional().or(z.literal("")),
          baseUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
        })
        .optional(),
    })
    .optional(),
  notificationPreferences: z
    .object({
      orderNew: z.object({
        methods: z.array(z.enum(["email", "whatsapp"])).default(["email"]),
      }),
    })
    .optional(),
});

export type StoreSettingsInput = z.infer<typeof StoreSettingsSchema>;
export type DeliveryZoneInput = z.infer<typeof DeliveryZoneSchema>;
