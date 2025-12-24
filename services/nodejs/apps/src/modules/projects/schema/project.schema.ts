import mongoose, { Schema, Model } from 'mongoose';

export interface IProject {
  orgId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  tags?: string[];
  goal?: string;
  systemPrompt?: string;
  template?: string;
  kbId?: string;
  memories?: Array<{
    _id?: mongoose.Types.ObjectId;
    key?: string;
    text: string;
    tags?: string[];
    approved?: boolean;
    createdBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    sourceConversationId?: mongoose.Types.ObjectId;
    sourceMessageId?: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  sharedWith?: Array<{
    userId: mongoose.Types.ObjectId;
    accessLevel: 'read' | 'write';
  }>;
}

const projectSchema = new Schema<IProject>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    tags: [{ type: String }],
    goal: { type: String },
    systemPrompt: { type: String },
    template: { type: String },
    kbId: { type: String, index: true },
    memories: [
      new Schema(
        {
          key: { type: String },
          text: { type: String, required: true },
          tags: [{ type: String }],
          approved: { type: Boolean, default: true },
          createdBy: { type: Schema.Types.ObjectId, required: true },
          approvedBy: { type: Schema.Types.ObjectId },
          sourceConversationId: { type: Schema.Types.ObjectId },
          sourceMessageId: { type: Schema.Types.ObjectId },
        },
        { _id: true, timestamps: true }
      ),
    ],
    isDeleted: { type: Boolean, default: false, index: true },
    sharedWith: [
      {
        userId: { type: Schema.Types.ObjectId },
        accessLevel: { type: String, enum: ['read', 'write'], default: 'read' },
      },
      { _id: false },
    ],
  },
  { timestamps: true },
);

projectSchema.index({ orgId: 1, createdBy: 1, title: 1 });

export const Project: Model<IProject> = mongoose.model<IProject>(
  'projects',
  projectSchema,
);


