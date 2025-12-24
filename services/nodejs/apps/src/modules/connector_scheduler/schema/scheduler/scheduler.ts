import { CrawlingScheduleType } from '../enums';
import { IBaseConnectorSchedule } from './base_scheduler';

// Schedule configuration interfaces
export interface ICustomScheduleConfig {
  cronExpression: string;
  timezone?: string;
  description?: string;
}

export interface IWeeklyScheduleConfig {
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  minute: number; // 0-59
  timezone?: string;
}

export interface IDailyScheduleConfig {
  hour: number; // 0-23
  minute: number; // 0-59
  timezone?: string;
}

export interface IHourlyScheduleConfig {
  minute: number; // 0-59
  interval?: number; // Every X hours (default: 1)
}

export interface IMonthlyScheduleConfig {
  dayOfMonth: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone?: string;
}

export interface IOnceScheduleConfig {
  scheduledTime: Date;
  timezone?: string;
}

// Specific interfaces for each schedule type
export interface ICustomCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.CUSTOM;
  scheduleConfig: ICustomScheduleConfig;
}

export interface IWeeklyCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.WEEKLY;
  scheduleConfig: IWeeklyScheduleConfig;
}

export interface IDailyCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.DAILY;
  scheduleConfig: IDailyScheduleConfig;
}

export interface IHourlyCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.HOURLY;
  scheduleConfig: IHourlyScheduleConfig;
}

export interface IMonthlyCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.MONTHLY;
  scheduleConfig: IMonthlyScheduleConfig;
}

export interface IOnceCrawlingSchedule extends IBaseConnectorSchedule {
  scheduleType: CrawlingScheduleType.ONCE;
  scheduleConfig: IOnceScheduleConfig;
}
