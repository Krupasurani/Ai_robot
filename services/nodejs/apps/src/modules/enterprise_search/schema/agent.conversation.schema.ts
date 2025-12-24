import mongoose, { Schema, Model, Document } from 'mongoose';
import {
  IAgentConversation,
  IMessage,
  IFeedback,
  IMessageCitation,
  IFollowUpQuestion,
} from '../types/conversation.interfaces';
import { CONFIDENCE_LEVELS } from '../constants/constants';

const followUpQuestionSchema = new Schema<IFollowUpQuestion>(
  {
    question: { type: String, required: true },
    confidence: { type: String, enum: CONFIDENCE_LEVELS, required: true },
    reasoning: { type: String },
  },
  { _id: false },
);

const messageCitationSchema = new Schema<IMessageCitation>(
  {
    citationId: { type: Schema.Types.ObjectId, ref: 'citations' },
    relevanceScore: { type: Number, min: 0, max: 1 },
    excerpt: { type: String },
    context: { type: String },
  },
  { _id: false },
);

const feedbackSchema = new Schema<IFeedback>(
  {
    isHelpful: { type: Boolean },
    ratings: {
      accuracy: { type: Number, min: 1, max: 5 },
      relevance: { type: Number, min: 1, max: 5 },
      completeness: { type: Number, min: 1, max: 5 },
      clarity: { type: Number, min: 1, max: 5 },
    },
    categories: [
      {
        type: String,
        enum: [
          'incorrect_information',
          'missing_information',
          'irrelevant_information',
          'unclear_explanation',
          'poor_citations',
          'excellent_answer',
          'helpful_citations',
          'well_explained',
          'other',
        ],
      },
    ],
    comments: {
      positive: { type: String },
      negative: { type: String },
      suggestions: { type: String },
    },
    citationFeedback: [
      {
        citationId: { type: Schema.Types.ObjectId, ref: 'citations' },
        isRelevant: { type: Boolean },
        relevanceScore: { type: Number, min: 1, max: 5 },
        comment: { type: String },
      },
    ],
    followUpQuestionsHelpful: { type: Boolean },
    unusedFollowUpQuestions: [{ type: String }],
    source: {
      type: String,
      enum: ['user', 'system', 'admin', 'auto'],
      default: 'user',
    },
    feedbackProvider: { type: Schema.Types.ObjectId },
    timestamp: { type: Number, default: Date.now },
    revisions: [
      {
        updatedFields: [{ type: String }],
        previousValues: { type: Map, of: Schema.Types.Mixed },
        updatedBy: { type: Schema.Types.ObjectId },
        updatedAt: { type: Number, default: Date.now },
      },
    ],
    metrics: {
      timeToFeedback: { type: Number },
      userInteractionTime: { type: Number },
      feedbackSessionId: { type: String },
      userAgent: { type: String },
      platform: { type: String },
    },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    messageType: {
      type: String,
      enum: ['user_query', 'bot_response', 'error', 'feedback', 'system', 'clarification', 'research_plan'],
      required: true,
    },
    content: { type: String, required: false, default: '' },
    contentFormat: {
      type: String,
      enum: ['MARKDOWN', 'JSON', 'HTML'],
      default: 'MARKDOWN',
    },
    citations: [messageCitationSchema],
    confidence: { type: String },  // Allow any string including empty
    followUpQuestions: [followUpQuestionSchema],
    feedback: [feedbackSchema],
    modelType: {
      type: String,
      enum: ['agent', 'knowledge', 'chat', 'deepResearch', 'image', 'science', 'search'],
      default: 'chat',
    },
    metadata: {
      processingTimeMs: { type: Number },
      modelVersion: { type: String },
      aiTransactionId: { type: String },
      reason: { type: String },
      // Clarification fields
      originalQuery: { type: String },
      isClarificationRequest: { type: Boolean },
      // Research plan confirmation fields
      isPlanConfirmation: { type: Boolean },
      researchPlan: [{ type: String }],
      assumptions: [{ type: String }],
      identifiedGaps: [{
        type: { type: String, enum: ['ambiguity', 'scope', 'target_format', 'intent'] },
        description: { type: String },
        impact: { type: String },
      }],
      confidenceScore: { type: Number },
      confidenceLevel: { type: String, enum: ['high', 'medium', 'low'] },
      reasoning: { type: String },
      // Image generation fields
      isImageGeneration: { type: Boolean },
      imageBase64: { type: String },
      imageMimeType: { type: String },
      model: { type: String },
    },
  },
  { timestamps: true },
);

const agentConversationSchema = new Schema<IAgentConversation>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, required: false, index: true },
    title: { type: String },
    titleLanguage: { type: String, default: 'en' },
    titleManuallySet: { type: Boolean, default: false },
    titleGeneratedAt: { type: Number },
    initiator: { type: Schema.Types.ObjectId, required: true, index: true },
    messages: [messageSchema],
    isShared: { type: Boolean, default: false },
    shareLink: { type: String },
    sharedWith: [
      {
        userId: { type: Schema.Types.ObjectId },
        accessLevel: { type: String, enum: ['read', 'write'], default: 'read' },
      },
      { _id: false },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId },
    isArchived: { type: Boolean, default: false },
    archivedBy: { type: Schema.Types.ObjectId },
    lastActivityAt: { type: Number, default: Date.now },
    status: {
      type: String,
      enum: ['None', 'Inprogress', 'Complete', 'Failed'],
    },
    failReason: { type: String },
    agentKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

agentConversationSchema.index({ orgId: 1, initiator: 1, agentKey: 1 });
agentConversationSchema.index({ isShared: 1 });
agentConversationSchema.index({ 'messages.content': 'text' });

export interface IAgentConversationDocument
  extends Document,
    IAgentConversation {}

export const AgentConversation: Model<IAgentConversation> =
  mongoose.model<IAgentConversation>(
    'agent_conversations',
    agentConversationSchema,
  );
