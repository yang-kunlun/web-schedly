export interface Schedule {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  remarks?: string;
  isDone: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}
