import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface RequestWithId extends Request {
  requestId: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const incoming = req.header("x-request-id");
    req.requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    res.setHeader("x-request-id", req.requestId);
    next();
  }
}
