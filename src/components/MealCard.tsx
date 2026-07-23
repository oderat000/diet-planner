"use client";

import * as React from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlined";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ReplayIcon from "@mui/icons-material/Replay";
import PublicIcon from "@mui/icons-material/Public";
import { cuisineFor } from "@/data/cuisines";
import { Meal } from "@/lib/types";
import type { SxProps, Theme } from "@mui/material/styles";

function Photo({ meal, width, height }: { meal: Meal; width: number; height: number }) {
  if (!meal.imageUrl) {
    return (
      <Box
        sx={{
          width,
          height,
          flexShrink: 0,
          borderRadius: 1,
          display: "grid",
          placeItems: "center",
          bgcolor: "action.hover",
          color: "text.disabled",
        }}
      >
        <RestaurantIcon fontSize={height > 80 ? "large" : "small"} />
      </Box>
    );
  }
  return (
    <Box
      sx={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Image
        src={meal.imageUrl}
        alt={meal.name}
        fill
        sizes={`${width}px`}
        style={{ objectFit: "cover" }}
      />
    </Box>
  );
}

/**
 * Origin, definition and taste for a dish — shown under its photo.
 * Origin always comes straight from the recipe (real). The definition and taste come
 * from the cuisine reference, which is Wikipedia-sourced; when a cuisine isn't in that
 * reference we show origin alone rather than invent a description.
 */
function CuisineNote({ meal, sx }: { meal: Meal; sx?: SxProps<Theme> }) {
  if (!meal.origin) return null;
  const cuisine = cuisineFor(meal.origin);

  return (
    <Box sx={{ ...sx }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <PublicIcon fontSize="inherit" sx={{ color: "text.secondary" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {meal.origin}
          {meal.category ? (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
              {meal.category}
            </Typography>
          ) : null}
        </Typography>
      </Box>

      {cuisine ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {cuisine.definition}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              Taste:
            </Box>{" "}
            {cuisine.taste}
          </Typography>
          <Typography
            variant="caption"
            component="a"
            href={cuisine.source}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "text.secondary", textDecoration: "underline" }}
          >
            Cuisine description from Wikipedia
          </Typography>
        </>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Origin as published by the recipe source.
        </Typography>
      )}
    </Box>
  );
}

/** The domain the recipe was published on, e.g. "bbcgoodfood.com". */
function publisher(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

export default function MealCard({
  meal,
  eaten,
  onToggle,
  onSwap,
}: {
  meal: Meal;
  eaten: boolean;
  onToggle: () => void;
  onSwap: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const ingredients = meal.mealIngredients ?? [];
  // plans saved before the switch to real data carry only the old string list
  const legacy = !meal.mealIngredients && meal.ingredients?.length ? meal.ingredients : null;
  const steps = meal.steps ?? [];
  const uncosted = ingredients.filter((i) => i.grams === null).length;
  const detailsId = `meal-details-${meal.name.replace(/\W+/g, "-")}`;

  return (
    <Paper variant="outlined">
      {/*
        Deliberately not an AccordionSummary: that renders a <button>, and this row
        holds a checkbox and two icon buttons. Nesting buttons is invalid HTML and
        breaks hydration, so the row is a plain div with its own expand control.
      */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, pr: 1.5 }}>
        <Checkbox
          checked={eaten}
          onChange={onToggle}
          slotProps={{ input: { "aria-label": `Mark ${meal.name} as eaten` } }}
        />

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontWeight: 600,
                textDecoration: eaten ? "line-through" : "none",
                color: eaten ? "text.disabled" : "text.primary",
              }}
            >
              {meal.name}
            </Typography>
            {/* the prepared dish, right of its name */}
            <Photo meal={meal} width={56} height={40} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {meal.description}
            {meal.portions && meal.portions !== 1 ? ` · ${meal.portions}× serving` : ""}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {meal.calories} kcal · {meal.proteinG} g protein
        </Typography>

        <Tooltip title="Swap this meal">
          <IconButton size="small" onClick={onSwap} aria-label={`Swap ${meal.name}`}>
            <ReplayIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={open ? "Hide recipe" : "Show recipe"}>
          <IconButton
            size="small"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={`${open ? "Hide" : "Show"} recipe for ${meal.name}`}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transition: "transform 150ms",
                transform: open ? "rotate(180deg)" : "none",
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box id={detailsId} sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "1fr 240px" },
          }}
        >
          {/* left: the recipe */}
          <Box>
            {(ingredients.length > 0 || legacy) && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Ingredients
                  {meal.portions && meal.portions !== 1 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      scaled to your portion
                    </Typography>
                  )}
                </Typography>
                <Box component="ul" sx={{ m: 0, mb: 2, pl: 2.5 }}>
                  {(legacy ?? ingredients.map((i) => i.display)).map((line, i) => (
                    <Typography key={i} component="li" variant="body2" sx={{ mb: 0.25 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            {steps.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Recipe
                </Typography>
                <Box component="ol" sx={{ m: 0, mb: 2, pl: 2.5 }}>
                  {steps.map((step, i) => (
                    <Typography key={i} component="li" variant="body2" sx={{ mb: 0.75 }}>
                      {step}
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            {!ingredients.length && !legacy && !steps.length && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This meal was saved before recipes existed. Swap it, or create a new plan, to get
                the full recipe.
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
              {meal.videoUrl && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayCircleOutlineIcon />}
                  href={meal.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch it being made
                </Button>
              )}
              {meal.sourceUrl && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<OpenInNewIcon />}
                  href={meal.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Recipe on {publisher(meal.sourceUrl)}
                </Button>
              )}
            </Box>

            {/* Say plainly where the numbers came from, and where they didn't. */}
            {meal.dataSource === "researched" && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Calories and protein summed from USDA FoodData Central measurements of each
                ingredient
                {uncosted > 0
                  ? ` · ${uncosted} ingredient${uncosted > 1 ? "s" : ""} too vaguely measured to weigh, so not counted`
                  : ""}
                .
              </Typography>
            )}
          </Box>

          {/* right: the plated dish, larger, with its cuisine beneath */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Photo meal={meal} width={240} height={170} />
            {meal.carbsG !== undefined && meal.fatG !== undefined && (
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                <Chip size="small" variant="outlined" label={`${meal.carbsG} g carbs`} />
                <Chip size="small" variant="outlined" label={`${meal.fatG} g fat`} />
              </Box>
            )}
            <CuisineNote meal={meal} sx={{ mt: 1.5 }} />
          </Box>
        </Box>

        {/* on narrow screens the right column is hidden — show the cuisine inline */}
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
          <CuisineNote meal={meal} />
        </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
