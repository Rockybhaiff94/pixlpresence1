/*
 * PixelsRPC Native Script for Discord Desktop / Electron
 * Copyright (c) 2026 PIXEL.GG
 * Whitelists PixelsRPC web & API hosts in Vencord Content Security Policy (CSP)
 */

import { CspPolicies, ImageAndCssSrc } from "@main/csp";

if (typeof CspPolicies === "object" && CspPolicies !== null) {
    CspPolicies["pixlpresence1-web.vercel.app"] = ImageAndCssSrc;
    CspPolicies["pixelgg-api.onrender.com"] = ImageAndCssSrc;
    CspPolicies["*.pixel.gg"] = ImageAndCssSrc;
    CspPolicies["pixel.gg"] = ImageAndCssSrc;
}

export const registeredCsp = true;
