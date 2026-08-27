import { z } from "zod";

// WebMCP validation runs under a strict production Content Security Policy.
// Zod's optional JIT probes `new Function`, which strict CSPs correctly block
// (and Firefox reports as a console error even though Zod catches it).
z.config({ jitless: true });
