import { keyframes } from '@emotion/react';
import StarsIcon from '@mui/icons-material/Stars';
import { Box, Stack, Typography } from '@mui/material';

const scanSweep = keyframes`
  0% { transform: translateX(-18px); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateX(18px); opacity: 0; }
`;

const reticlePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(144, 202, 249, 0.32), inset 0 0 18px rgba(144, 202, 249, 0.18); }
  50% { box-shadow: 0 0 0 10px rgba(144, 202, 249, 0), inset 0 0 28px rgba(144, 202, 249, 0.32); }
`;

const starPulse = keyframes`
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255, 224, 130, 0.7)); }
  50% { transform: scale(1.14); filter: drop-shadow(0 0 18px rgba(255, 224, 130, 1)); }
`;

const signalDrift = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 44px 0; }
`;

function clampProgress(progress) {
  const numericProgress = Number(progress);

  if (!Number.isFinite(numericProgress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericProgress));
}

export default function RocketLoadingBar({ progress = 0, target, mission, message }) {
  const boundedProgress = clampProgress(progress);
  const targetName = target?.trim() || 'target star';
  const missionName = mission || 'mission';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'rgba(144, 202, 249, 0.28)',
        borderRadius: 3,
        overflow: 'hidden',
        p: { xs: 2, sm: 2.5 },
        background:
          'radial-gradient(circle at 88% 24%, rgba(255, 224, 130, 0.14), transparent 18%), linear-gradient(135deg, rgba(18, 26, 47, 0.98), rgba(11, 16, 32, 0.94))',
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Stack spacing={1.8}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" color="primary" fontWeight={800}>
            Scanning {targetName} with {missionName}...
          </Typography>
          {message && (
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          )}
        </Stack>

        <Box
          aria-label={`Scanning progress ${Math.round(boundedProgress)} percent`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(boundedProgress)}
          sx={{
            position: 'relative',
            minHeight: { xs: 72, sm: 84 },
            px: { xs: 2.75, sm: 3.5 },
            py: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(144,202,249,0.08) 1px, transparent 1px)',
              backgroundPosition: '0 0',
              backgroundSize: '44px 34px',
              opacity: 0.42,
              animation: `${signalDrift} 2.4s linear infinite`,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              left: { xs: 26, sm: 34 },
              right: { xs: 26, sm: 34 },
              top: '50%',
              height: 12,
              borderRadius: 999,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, rgba(38, 50, 92, 0.95), rgba(21, 101, 192, 0.55), rgba(255, 224, 130, 0.34))',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.38), 0 0 20px rgba(144,202,249,0.12)',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: `${boundedProgress}%`,
                height: '100%',
                borderRadius: 'inherit',
                transition: 'width 420ms ease-out',
                background: 'linear-gradient(90deg, #42a5f5, #90caf9, #ffe082)',
                boxShadow: '0 0 18px rgba(144,202,249,0.7)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: 36,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
                  animation: `${scanSweep} 1.1s ease-in-out infinite`,
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              left: { xs: 26, sm: 34 },
              right: { xs: 26, sm: 34 },
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: `clamp(20px, ${boundedProgress}%, calc(100% - 28px))`,
                top: '50%',
                width: { xs: 38, sm: 46 },
                height: { xs: 38, sm: 46 },
                border: '2px solid rgba(144, 202, 249, 0.92)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                transition: 'left 520ms cubic-bezier(0.22, 1, 0.36, 1)',
                animation: `${reticlePulse} 1.25s ease-in-out infinite`,
                '&::before, &::after': {
                  content: '""',
                  position: 'absolute',
                  bgcolor: 'rgba(144, 202, 249, 0.9)',
                },
                '&::before': {
                  left: '50%',
                  top: -7,
                  bottom: -7,
                  width: 2,
                  transform: 'translateX(-50%)',
                },
                '&::after': {
                  top: '50%',
                  left: -7,
                  right: -7,
                  height: 2,
                  transform: 'translateY(-50%)',
                },
              }}
            />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              right: { xs: 6, sm: 10 },
              top: '50%',
              transform: 'translateY(-50%)',
              width: { xs: 42, sm: 52 },
              height: { xs: 42, sm: 52 },
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'radial-gradient(circle, rgba(255,224,130,0.28), rgba(255,224,130,0.05) 58%, transparent 70%)',
            }}
          >
            <StarsIcon
              sx={{
                color: '#ffe082',
                fontSize: { xs: 32, sm: 42 },
                animation: `${starPulse} 1.55s ease-in-out infinite`,
              }}
            />
          </Box>
        </Box>

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            Signal lock
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {Math.round(boundedProgress)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Lightkurve data
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
