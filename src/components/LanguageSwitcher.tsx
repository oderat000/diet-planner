"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { LANGUAGES, useI18n } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        color="inherit"
        size="small"
        aria-label="Change language"
        aria-haspopup="true"
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "1rem" }} />}
        sx={{ textTransform: "none", minWidth: 0, px: 1 }}
      >
        <span style={{ fontSize: "1rem", lineHeight: 1 }}>{current.flag}</span>
        <span style={{ marginLeft: 5, fontSize: "0.7rem", opacity: 0.75 }}>{current.code}</span>
      </Button>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {LANGUAGES.map((l) => (
          <MenuItem
            key={l.code}
            selected={l.code === lang}
            onClick={() => {
              setLang(l.code);
              setAnchor(null);
            }}
          >
            <ListItemIcon sx={{ fontSize: "1.25rem", minWidth: 34 }}>{l.flag}</ListItemIcon>
            <ListItemText>{l.label}</ListItemText>
            {l.code === lang && <CheckIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
