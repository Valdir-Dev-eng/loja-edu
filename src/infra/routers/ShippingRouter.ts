import { CalculateShippingInput } from "../../app/shipping/dto/CalculateShippingInput";
import { ShippingController } from "../controller/ShippingController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { ShippingValidator } from "../validators/ShippingValidator";

type ShippingQuoteInjection = { shippingQuoteInput: CalculateShippingInput };

export class ShippingRouter {
    constructor(private server: ServerPort, private controller: ShippingController, private validator: ShippingValidator) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("post", "/shipping/quote", this.validateQuoteInput, this.quote);
    }

    private validateQuoteInput: middleWare = async (req, res, next) => {
        try {
            const data = this.validator.validateQuote(req.body);
            (req as IRequest<any, any, any, ShippingQuoteInjection>).shippingQuoteInput = data;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private quote: middleWare = async (req, res) => {
        try {
            const input = (req as IRequest<any, any, any, ShippingQuoteInjection>).shippingQuoteInput;
            const result = await this.controller.quote(input, req.ip ?? "unknown-client");
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
