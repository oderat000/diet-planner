"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useT } from "@/lib/i18n";

const FAQ_KEYS = ["cost", "data", "account", "medical", "ai", "offline", "data2"] as const;

export default function AboutPage() {
  const t = useT();

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto", mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("about.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("about.subtitle")}
        </Typography>
      </Box>

      <Box>
        {FAQ_KEYS.map((key) => (
          <Accordion key={key} variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{t(`about.faq.${key}.q`)}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {key === "data" ? (
                  <>
                    From the USDA FoodData Central database, bundled directly in the app — see the{" "}
                    <MuiLink component={Link} href="/methodology">
                      how it works
                    </MuiLink>{" "}
                    page for details on how it&rsquo;s used.
                  </>
                ) : (
                  t(`about.faq.${key}.a`)
                )}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <Box sx={{ textAlign: "center", mt: 1 }}>
        <Button component={Link} href="/create" variant="contained" size="large">
          {t("about.cta")}
        </Button>
      </Box>
    </Box>
  );
}
