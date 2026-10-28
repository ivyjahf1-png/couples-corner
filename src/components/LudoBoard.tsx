"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FINISH_STEP,
  trackCell,
  type LudoColor,
  type LudoGameState,
} from "../../web/lib/ludo/engine";