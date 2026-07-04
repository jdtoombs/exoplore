import {
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

const sections = [
  {
    title: 'Where the data comes from',
    items: [
      'Exoplore uses the Python Lightkurve library on the backend.',
      'Lightkurve searches and downloads public light curve products from MAST, the Mikulski Archive for Space Telescopes.',
      'Supported mission choices in this app are Kepler, K2, and TESS.',
      'The target suggestions are either curated starter examples or live Lightkurve/MAST search results.',
    ],
  },
  {
    title: 'What we currently do to the data',
    items: [
      'Search for available light curve data for the selected target and mission.',
      'Download a bounded set of useful matching light curve products currently returned by Lightkurve.',
      'Apply Lightkurve mission quality filtering with the default quality bitmask.',
      'Stitch downloaded products into one combined light curve when multiple products are used.',
      'Remove NaN or invalid measurements.',
      'Normalize the flux so the typical brightness is near 1.0.',
      'Remove cautious outliers while avoiding aggressive removal of downward transit-like dips.',
      'Create a flattened flux version to reduce slow stellar or instrument trends.',
      'Return time, normalized flux, flattened flux, and cleaning metadata to the browser.',
      'Cache prepared light curve responses in backend memory for 30 minutes while Flask is running.',
    ],
  },
  {
    title: 'What the charts show',
    items: [
      'The main chart shows normalized brightness over time.',
      'The moving average line is a visual smoothing helper, not a planet detector by itself.',
      'Tight y-axis ranges make shallow dips easier to inspect.',
      'The folded chart stacks data on a selected period so repeated dips can line up near phase 0.',
    ],
  },
  {
    title: 'What BLS does',
    items: [
      'BLS means Box Least Squares.',
      'It runs on the cleaned/flattened flux when available.',
      'It may use a downsampled copy of the cleaned data for speed; the full cleaned chart data is still preserved.',
      'It tries many possible periods and durations looking for repeating box-shaped dips.',
      'The periodogram shows which trial periods produced stronger BLS power.',
      'A BLS peak is a candidate signal, not proof of a planet.',
      'False positives can come from instrument artifacts, noisy data, stellar activity, or eclipsing binary stars.',
    ],
  },
  {
    title: 'Known limitations right now',
    items: [
      'The app stitches a bounded set of products, not necessarily every available quarter, campaign, or sector.',
      'The app does not yet show detailed mission quality flags to the user.',
      'The flattening settings are currently fixed rather than user-controlled.',
      'The BLS search uses a bounded grid for speed, so very fine searches may need future controls.',
      'The app does not yet run full candidate vetting such as odd/even depth checks or secondary eclipse checks.',
    ],
  },
  {
    title: 'What we plan to improve',
    items: [
      'Download and stitch more available light curve products.',
      'Apply clearer quality filtering and careful outlier removal.',
      'Create and display flattened/detrended flux.',
      'Use improved adaptive BLS period searches.',
      'Add candidate-vetting metrics like transit count, SNR, odd/even comparison, and secondary eclipse warnings.',
    ],
  },
];

function BulletSection({ section }) {
  return (
    <Card elevation={3}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h5" component="h2" fontWeight={800}>
            {section.title}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item) => (
              <ListItem key={item} sx={{ alignItems: 'flex-start', px: 0 }}>
                <ListItemText
                  primary={item}
                  primaryTypographyProps={{ color: 'text.secondary' }}
                  sx={{ m: 0 }}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AboutDataPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="overline" color="primary">
          Transparency
        </Typography>
        <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
          About the Data
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '780px' }}>
          Exoplore uses public mission light curves to help you explore possible transit-like signals.
          This page explains where the data comes from, what the app currently does with it, and what
          still needs to improve.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
          <Chip label="Public data" color="primary" variant="outlined" />
          <Chip label="Lightkurve + MAST" color="primary" variant="outlined" />
          <Chip label="Candidates only" color="warning" variant="outlined" />
        </Stack>
      </Box>

      <Stack spacing={3}>
        {sections.map((section) => (
          <BulletSection key={section.title} section={section} />
        ))}
      </Stack>
    </Stack>
  );
}
