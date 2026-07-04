import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';

const faqItems = [
  {
    question: 'What is a target?',
    answer: (
      <Typography>
        A target is the object you want to search for, usually a star. Examples are Kepler-10,
        KIC 11904151, or a TESS Input Catalog identifier like TIC 307210830.
      </Typography>
    ),
  },
  {
    question: 'What is a mission?',
    answer: (
      <Typography>
        A mission is the telescope survey that collected the data. Kepler, K2, and TESS are common
        missions used for exoplanet light curve analysis.
      </Typography>
    ),
  },
  {
    question: 'What are Kepler, K2, and TESS?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Kepler watched one region of the sky for years, which made it excellent for finding small,
          repeating planet transits.
        </Typography>
        <Typography color="text.secondary">
          K2 was Kepler's later mission after hardware issues changed how it observed. TESS surveys
          much more of the sky, usually in shorter observing sectors.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What is a light curve?',
    answer: (
      <Typography>
        A light curve is brightness over time. The x-axis is time, and the y-axis is flux. Planet
        transits can appear as small dips in brightness when a planet passes in front of its star.
      </Typography>
    ),
  },
  {
    question: 'What is flux?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Flux is the brightness measurement from the star. In this app, the flux is normalized,
          so the star's usual brightness is near 1.0.
        </Typography>
        <Typography color="text.secondary">
          For example, 1.01 means a little brighter than normal, while 0.99 means a little dimmer
          than normal.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What is normalized flux?',
    answer: (
      <Typography>
        Normalized flux rescales the light curve so the typical brightness is around 1.0. This makes
        dips easier to compare: 0.99 is about 1% dimmer than the baseline.
      </Typography>
    ),
  },
  {
    question: 'What is noisy data?',
    answer: (
      <Typography>
        Noisy data contains random scatter or messy measurements that are not the signal you are
        looking for. Noise can come from the telescope, background light, stellar activity, or normal
        measurement uncertainty.
      </Typography>
    ),
  },
  {
    question: 'What is an outlier?',
    answer: (
      <Typography>
        An outlier is a point that is unusually far from the surrounding data. Outliers can be real,
        but they are often caused by glitches, cosmic rays, or processing artifacts. Too many
        outliers can confuse planet-search algorithms.
      </Typography>
    ),
  },
  {
    question: 'What is a trend?',
    answer: (
      <Typography>
        A trend is a slow change in the data. It might come from the telescope, the instrument, or
        longer-term stellar behavior. Trends can make small dips harder to see, so we often estimate
        and remove them.
      </Typography>
    ),
  },
  {
    question: 'What is flattening?',
    answer: (
      <Typography>
        Flattening is a common light curve cleaning step that removes slow trends while keeping
        shorter changes. In planet searching, flattening can make repeated transit dips easier to see.
      </Typography>
    ),
  },
  {
    question: 'What is the moving average line?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          The moving average is a simple smoothed trend line. For each point, the app averages that
          point with a set number of previous flux values.
        </Typography>
        <Typography color="text.secondary">
          Formula: average = (x1 + x2 + ... + xn) / n. Each x is a flux value inside the current
          window.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What does detrending mean?',
    answer: (
      <Typography>
        Detrending means removing the slow background shape from the light curve. The goal is to keep
        the short-term changes, like possible transit dips, while reducing slow drift in the data.
      </Typography>
    ),
  },
  {
    question: 'Why would detrendedFlux = flux / movingAverage?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          This compares the measured brightness to the local expected brightness. The moving average
          acts like the local baseline or trend.
        </Typography>
        <Typography color="text.secondary">
          Example: if flux is 0.98 and the moving average is 1.02, then 0.98 / 1.02 = 0.9608. That
          means the star is about 96% of the local expected brightness at that time.
        </Typography>
        <Typography color="text.secondary">
          If flux and moving average are both 1.02, then 1.02 / 1.02 = 1.0, meaning the star is right
          at its local baseline.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'Why divide instead of subtract?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Division keeps the result centered around 1.0, which is useful for normalized light curves.
          A value below 1.0 is dimmer than the local baseline, and a value above 1.0 is brighter.
        </Typography>
        <Typography color="text.secondary">
          Subtraction is also possible: detrendedFlux = flux - movingAverage. That centers the result
          around 0.0 instead.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What is a transit?',
    answer: (
      <Typography>
        A transit happens when a planet passes in front of its star from our point of view. The star
        appears slightly dimmer for a short time, creating a dip in the light curve.
      </Typography>
    ),
  },
  {
    question: 'What is period?',
    answer: (
      <Typography>
        Period is how long it takes a repeating signal to happen again. For a planet, the period is
        its orbital time, such as one transit every 3.2 days.
      </Typography>
    ),
  },
  {
    question: 'What is transit depth?',
    answer: (
      <Typography>
        Transit depth is how far the brightness drops during a transit. Deeper transits usually mean
        a larger object is blocking more of the star's light.
      </Typography>
    ),
  },
  {
    question: 'What is transit duration?',
    answer: (
      <Typography>
        Transit duration is how long the dip lasts. It depends on the planet's orbit, the star's
        size, and the path the planet takes across the star.
      </Typography>
    ),
  },
  {
    question: 'What is Box Least Squares?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Box Least Squares, or BLS, is a transit search algorithm. It tries many possible periods and
          durations to find repeating box-shaped dips that could be caused by a planet.
        </Typography>
        <Typography color="text.secondary">
          BLS is stronger than clicking isolated low points because planet transits should repeat at a
          consistent period. A high BLS result is still only a candidate, not proof.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What is phase?',
    answer: (
      <Typography>
        Phase is where a data point falls within one repeating cycle. In a folded transit view, phase
        0 is usually placed at the predicted transit center so the stacked dip is easy to inspect.
      </Typography>
    ),
  },
  {
    question: 'What is a folded light curve?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Folding stacks the light curve on a chosen period. Instead of plotting absolute time, each
          point is replotted by where it falls inside one repeating cycle, called phase.
        </Typography>
        <Typography color="text.secondary">
          If the chosen period matches a real planet orbit, separate transits from many days or years
          line up on top of each other. Stacking them makes a shallow repeating dip easier to see than
          one noisy dip by itself. If the period is wrong, the points usually stay scattered.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What is a false positive?',
    answer: (
      <Typography>
        A false positive is a signal that looks planet-like but is not actually a planet. Eclipsing
        binary stars, instrument problems, stellar activity, and random noise can all create false
        positives.
      </Typography>
    ),
  },
  {
    question: 'Why does the chart default to median flux ±0.5%?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          Normalized light curves usually sit near 1.0, but the exact baseline can shift slightly.
          Centering the y-axis on median flux gives a stable local baseline that is less affected by
          occasional outliers than the minimum or maximum value.
        </Typography>
        <Typography color="text.secondary">
          The ±0.5% range clips distracting outliers and makes shallow transit-like dips easier to
          inspect. You can switch to Auto, ±0.1%, ±0.25%, ±1%, or ±2% depending on how noisy the
          target is.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'What does cached data mean?',
    answer: (
      <Typography>
        When you load a target, the backend keeps the prepared light curve in memory for 30 minutes.
        Loading the same target and mission again during that window uses the cached copy instead of
        downloading from Lightkurve/MAST again. The cache resets when the Flask server restarts.
      </Typography>
    ),
  },

  {
    question: 'Where do target typeahead suggestions come from?',
    answer: (
      <Stack spacing={1}>
        <Typography>
          When the target box opens with no text, the app shows a small curated starter list for the
          selected mission. These are helpful examples, not the full mission catalog.
        </Typography>
        <Typography color="text.secondary">
          When you type, the backend asks Lightkurve/MAST for matching light curve results and returns
          unique target names from those results. Kepler, K2, and TESS catalogs are too large to load
          entirely into the browser, so suggestions are searched live instead.
        </Typography>
      </Stack>
    ),
  },
  {
    question: 'Does using Plotly make Lightkurve useless?',
    answer: (
      <Typography>
        No. Lightkurve handles astronomy-specific work like searching, downloading, cleaning, and
        normalizing mission data. Plotly only renders the chart in the browser.
      </Typography>
    ),
  },
];

function FaqItem({ item }) {
  return (
    <Accordion disableGutters>
      <AccordionSummary>
        <Typography fontWeight={700}>{item.question}</Typography>
      </AccordionSummary>
      <AccordionDetails>{item.answer}</AccordionDetails>
    </Accordion>
  );
}

export default function FaqPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="overline" color="primary">
          Help
        </Typography>
        <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
          FAQ
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '760px' }}>
          Quick definitions for the astronomy and charting ideas used in this app.
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardContent>
          {faqItems.map((item) => (
            <FaqItem key={item.question} item={item} />
          ))}
        </CardContent>
      </Card>
    </Stack>
  );
}
