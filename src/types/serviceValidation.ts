export default interface ServiceValidation<T = unknown> {
  ok: boolean;
  status: number;
  message: string;
  data?: T;
}
