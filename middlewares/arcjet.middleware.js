import aj from "../config/arcjet.js";

const arcjetMiddleware = async (req, res, next) => {
    try {
        // Skip if no key is provided
      //  if (!process.env.ARCJET_KEY) {
        //    console.log('Arcjet middleware skipped - no key provided');
         //   return next();
      //  }

        const decision = await aj.protect(req);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ 
                    message: "Rate limit exceeded. Please try again later." 
                });
            }
            if (decision.reason.isBot()) {
                return res.status(403).json({ 
                    error: "Bot detected. Access denied." 
                });
            }
        }

        next();
    } catch (error) {
        console.log(`Arcjet middleware error: ${error.message}`);
        // In development, continue without Arcjet protection
        if (process.env.NODE_ENV !== 'production') {
            console.log('Continuing without Arcjet protection in development...');
            next();
        } else {
            // In production, you might want to fail more gracefully
            next(error);
        }
    }
}

export default arcjetMiddleware;