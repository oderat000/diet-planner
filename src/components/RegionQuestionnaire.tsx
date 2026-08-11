"use client";

import * as React from "react";
import worldMap from "@svg-maps/world";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import PublicIcon from "@mui/icons-material/Public";
import {
  cuisineForCountry,
  regionPreferenceSnapshot,
  saveRegionPreference,
  serverRegionPreferenceSnapshot,
  subscribeRegionPreference,
  type LocalDishPreference,
  type RegionPreference,
} from "@/lib/region";

type MapLocation = { id: string; name: string; path: string };
const mapLocations = worldMap.locations as MapLocation[];
const locations = [...mapLocations].sort((a, b) => a.name.localeCompare(b.name));

interface RegionQuestionnaireProps {
  onSave?: (preference: RegionPreference) => void;
}

export default function RegionQuestionnaire({ onSave }: RegionQuestionnaireProps) {
  const stored = React.useSyncExternalStore(
    subscribeRegionPreference,
    regionPreferenceSnapshot,
    serverRegionPreferenceSnapshot,
  );
  const [draftCountryCode, setDraftCountryCode] = React.useState<string | null>(null);
  const [draftPreference, setDraftPreference] = React.useState<LocalDishPreference | null>(null);
  const countryCode = draftCountryCode ?? stored?.countryCode ?? "";
  const preference = draftPreference ?? stored?.localDishPreference ?? "balanced";
  const saved = stored !== null && draftCountryCode === null && draftPreference === null;

  const selected = locations.find((location) => location.id === countryCode) ?? null;
  const selectedCuisine = cuisineForCountry(selected?.name);
  const orderedLocations = selected
    ? [...mapLocations.filter((location) => location.id !== selected.id), selected]
    : mapLocations;

  const chooseCountry = (code: string) => {
    setDraftCountryCode(code);
  };

  const save = () => {
    if (!selected) return;
    const nextPreference: RegionPreference = {
      country: selected.name,
      countryCode: selected.id,
      localDishPreference: preference,
    };
    saveRegionPreference(nextPreference);
    onSave?.(nextPreference);
    setDraftCountryCode(null);
    setDraftPreference(null);
  };

  return (
    <Box
      component="section"
      aria-labelledby="region-question-title"
      sx={{ width: "100%" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <PublicIcon color="primary" />
        <Typography id="region-question-title" variant="h5" sx={{ fontWeight: 700 }}>
          What tastes like home?
        </Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Pick your country and tell us how local you want your meals. Your next diet plan
        will use this preference when choosing real recipes.
      </Typography>

      <Box
        sx={{
          aspectRatio: "3 / 1",
          width: "100%",
          minHeight: 180,
          maxHeight: 310,
          overflow: "hidden",
          border: "2px solid",
          borderColor: "text.primary",
          borderRadius: 2,
          bgcolor: "#9a9a98",
          position: "relative",
        }}
      >
        <svg
          viewBox={worldMap.viewBox}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          role="listbox"
          aria-label="Choose your country on the world map"
          style={{ display: "block" }}
        >
          {orderedLocations.map((location) => {
            const isSelected = location.id === countryCode;
            return (
              <path
                key={location.id}
                d={location.path}
                role="option"
                aria-label={location.name}
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => chooseCountry(location.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    chooseCountry(location.id);
                  }
                }}
                style={{
                  fill: isSelected ? "#f5b335" : "#a9d8ed",
                  stroke: "#111111",
                  strokeWidth: isSelected ? 1.5 : 0.65,
                  vectorEffect: "non-scaling-stroke",
                  cursor: "pointer",
                  outline: "none",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  transition: "fill 180ms ease, transform 180ms ease, filter 180ms ease",
                  filter: isSelected ? "drop-shadow(0 2px 2px rgba(0,0,0,.35)) saturate(1.35)" : "none",
                }}
              >
                <title>{location.name}</title>
              </path>
            );
          })}
        </svg>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(210px, .8fr) 1.2fr" },
          gap: 2.5,
          alignItems: "start",
          mt: 2.5,
        }}
      >
        <TextField
          select
          label="Your country"
          value={countryCode}
          onChange={(event) => chooseCountry(event.target.value)}
          helperText="Tap the map or use this list."
          fullWidth
        >
          {locations.map((location) => (
            <MenuItem key={location.id} value={location.id}>
              {location.name}
            </MenuItem>
          ))}
        </TextField>

        <FormControl>
          <FormLabel id="local-food-label">How local should your plan feel?</FormLabel>
          <RadioGroup
            aria-labelledby="local-food-label"
            value={preference}
            onChange={(event) => {
              setDraftPreference(event.target.value as LocalDishPreference);
            }}
          >
            <FormControlLabel value="mostly-local" control={<Radio />} label="Mostly local classics" />
            <FormControlLabel value="balanced" control={<Radio />} label="A local and global mix" />
            <FormControlLabel value="global" control={<Radio />} label="Surprise me with global dishes" />
          </RadioGroup>
        </FormControl>
      </Box>

      {selected && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: 1.5 }}>
          <Chip label={selected.name} color="primary" />
          {preference !== "global" && (
            <Typography variant="body2" color="text.secondary">
              {selectedCuisine
                ? `${selectedCuisine} recipes will be favored in your next plan.`
                : "We’ll save your region; local recipes will be used when the catalogue has a verified match."}
            </Typography>
          )}
        </Box>
      )}

      <Button
        variant="contained"
        onClick={save}
        disabled={!selected}
        startIcon={saved ? <CheckCircleOutlineIcon /> : undefined}
        sx={{ mt: 2 }}
      >
        {saved ? "Preference saved" : "Use this for my diet"}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Map data © MapSVG contributors, licensed CC BY 4.0.
      </Typography>
    </Box>
  );
}
