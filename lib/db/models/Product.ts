import mongoose, { Schema, type Document } from "mongoose";

export interface IProductDocument extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  sku: string;
  images: {
    url: string;
    publicId: string;
    alt?: string;
    order: number;
  }[];
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  tags: string[];
  isFeatured: boolean;
  isSponsored: boolean;
  stock: number;
  trackStock: boolean;
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  status: "active" | "draft" | "archived";
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
  specifications?: Map<string, string>;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: "cm" | "in";
  };
  avgRating: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: String,
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const SeoMetaSchema = new Schema(
  {
    metaTitle: String,
    metaDescription: String,
    ogImage: String,
  },
  { _id: false },
);

const DimensionsSchema = new Schema(
  {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, enum: ["cm", "in"], default: "cm" },
  },
  { _id: false },
);

const ProductSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    shortDescription: {
      type: String,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (this: any, val: number) {
          return !val || val < this.price;
        },
        message: "Discount price must be less than the regular price",
      },
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
    },
    images: [ProductImageSchema],
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    isFeatured: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    stock: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: function (this: any, val: number) {
          return this.allowNegativeStock || val >= 0;
        },
        message:
          "Stock cannot be negative for products that do not allow negative stock",
      },
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },
    trackStock: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "draft",
    },
    seoMeta: SeoMetaSchema,
    specifications: {
      type: Map,
      of: String,
    },
    weight: Number,
    dimensions: DimensionsSchema,
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

/* Indexes */
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isFeatured: 1, status: 1 });
ProductSchema.index({ isSponsored: 1, status: 1 });
ProductSchema.index({ avgRating: -1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ createdAt: -1 });
// MongoDB allows only one text index per collection. If this collection was
// created before this field set changed, drop the old one first:
//   db.products.dropIndex("name_text_description_text_tags_text")
// otherwise Mongoose's autoIndex will fail silently to build "ProductTextIndex".
ProductSchema.index(
  {
    name: "text",
    sku: "text",
    tags: "text",
    shortDescription: "text",
    description: "text",
  },
  {
    name: "ProductTextIndex",
    weights: { name: 10, sku: 8, tags: 5, shortDescription: 3, description: 1 },
  },
);

const Product =
  (mongoose.models.Product as mongoose.Model<IProductDocument>) ||
  mongoose.model<IProductDocument>("Product", ProductSchema);

export default Product;
