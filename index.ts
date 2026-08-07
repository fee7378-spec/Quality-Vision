export type Analyst = {
  id: string;
  name: string;
  monitorings: number;
  errors: number;
  quality: number;
  lastMonitoring: string;
};

export type Macro = {
  id: string;
  name: string;
  errors: number;
};
