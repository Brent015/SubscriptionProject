import aj from "../config/arcjet.js";

const arcjetMiddleware = async (req, res, next) => {
    try {
        const decision = await aj.protect(req);

        if (decision.isDenied()){
            if(decision.reason.isRateLimit()) return res.status(429).json({ message: "Rate limit exceeded. Please try again later."});
            if(decision.reason.isBot()) return res.status(403).json({error:"Bot detected. Access denied."});
        }

        next();
    } catch (error) {
        console.log (`arcjetMiddleware error: ${error.message}`);
        next(error);
    }
}

export default arcjetMiddleware;