import mongoose, { Schema, Model, Document } from 'mongoose';

export type PromptVisibility = 'private' | 'users' | 'workspace';

export type PromptAccessLevel = 'read' | 'write';

export interface PromptSharedWithEntry {
  userId: mongoose.Types.ObjectId;
  accessLevel: PromptAccessLevel;
}

export interface PromptTemplateAttrs {
  orgId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  visibility?: PromptVisibility;
  sharedWith?: PromptSharedWithEntry[];
  isDeleted?: boolean;
}

export interface PromptTemplateDocument
  extends PromptTemplateAttrs,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const promptTemplateSchema = new Schema<PromptTemplateDocument>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    content: { type: String, required: true, maxlength: 20000 },
    category: {
      type: String,
      trim: true,
      default: 'general',
      maxlength: 120,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 60,
      },
    ],
    visibility: {
      type: String,
      enum: ['private', 'users', 'workspace'],
      default: 'private',
      index: true,
    },
    sharedWith: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'users',
          required: true,
        },
        accessLevel: {
          type: String,
          enum: ['read', 'write'],
          default: 'read',
        },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

promptTemplateSchema.index({
  orgId: 1,
  visibility: 1,
  updatedAt: -1,
});

promptTemplateSchema.index({
  orgId: 1,
  'sharedWith.userId': 1,
});

promptTemplateSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
});

export const PromptTemplate: Model<PromptTemplateDocument> =
  (mongoose.models.prompt_templates as Model<PromptTemplateDocument>) ||
  mongoose.model<PromptTemplateDocument>(
    'prompt_templates',
    promptTemplateSchema,
  );


