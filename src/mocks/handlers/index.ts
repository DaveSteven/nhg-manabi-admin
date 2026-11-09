import { authHandlers } from "./auth";
import { userHandlers } from "./user";
import { examQuestionHandlers } from "./examQuestion";

export const handlers = [...authHandlers, ...userHandlers, ...examQuestionHandlers];
