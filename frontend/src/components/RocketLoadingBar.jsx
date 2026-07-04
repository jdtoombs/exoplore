import { keyframes } from '@emotion/react';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarsIcon from '@mui/icons-material/Stars';
import { Box, Stack, Typography } from '@mui/material';

const rocketBob = keyframes`
  0%, 100% { transform: translateY(0) rotate(38deg); }
  50% { transform: translateY(-6px) rotate(44deg); }
`;

const flameFlicker = keyframes`
  0%, 100% { opacity: 0.55; transform: translateX(-1px) scaleX(0.82); }
  50% { opacity: 1; transform: translateX(-5px) scaleX(1.12); }
`;

const starPulse = keyframes`
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255, 224, 130, 0.7)); }
  50% { transform: scale(1.16); filter: drop-shadow(0 0 18px rgba(255, 224, 130, 1)); }
`;

const dustDrift = keyframes`
  0% { opacity: 0.8; transform: translateX(0) scale(1); }
  100% { opacity: 0; transform: translateX(-18px) scale(0.45); }
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
  const destination = target?.trim() || 'your target star';
  const missionName = mission || 'mission data';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'rgba(144, 202, 249, 0.28)',
        borderRadius: 3,
        overflow: 'hidden',
        p: { xs: 2, sm: 2.5 },
        background:
          'radial-gradient(circle at 88% 24%, rgba(255, 224, 130, 0.16), transparent 18%), linear-gradient(135deg, rgba(18, 26, 47, 0.98), rgba(11, 16, 32, 0.94))',
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Stack spacing={1.8}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" color="primary" fontWeight={800}>
            Flying to {destination} in {missionName}...
          </Typography>
          {message && (
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          )}
        </Stack>

        <Box
          aria-label={`Loading progress ${Math.round(boundedProgress)} percent`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(boundedProgress)}
          sx={{
            position: 'relative',
            minHeight: { xs: 64, sm: 76 },
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
                'radial-gradient(circle, rgba(255,255,255,0.32) 1px, transparent 1px), radial-gradient(circle, rgba(144,202,249,0.22) 1px, transparent 1px)',
              backgroundPosition: '0 0, 22px 18px',
              backgroundSize: '44px 34px, 58px 48px',
              opacity: 0.45,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              left: { xs: 26, sm: 34 },
              right: { xs: 26, sm: 34 },
              top: '50%',
              height: 10,
              borderRadius: 999,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, rgba(38, 50, 92, 0.95), rgba(21, 101, 192, 0.55), rgba(255, 224, 130, 0.42))',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.38), 0 0 20px rgba(144,202,249,0.12)',
            }}
          >
            <Box
              sx={{
                width: `${boundedProgress}%`,
                height: '100%',
                borderRadius: 'inherit',
                transition: 'width 420ms ease-out',
                background: 'linear-gradient(90deg, #42a5f5, #90caf9, #ffe082)',
                boxShadow: '0 0 18px rgba(144,202,249,0.7)',
              }}
            />
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
                left: `clamp(18px, ${boundedProgress}%, calc(100% - 34px))`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                transition: 'left 520ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: -24,
                  top: '50%',
                  width: 24,
                  height: 8,
                  borderRadius: '999px 0 0 999px',
                  transformOrigin: 'right center',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 112, 67, 0.9), rgba(255, 224, 130, 1))',
                  filter: 'blur(0.2px)',
                  animation: `${flameFlicker} 360ms ease-in-out infinite`,
                }}
              />
              {[0, 1, 2].map((dot) => (
                <Box
                  key={dot}
                  sx={{
                    position: 'absolute',
                    left: -10 - dot * 8,
                    top: 13 + dot * 3,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: dot % 2 ? 'rgba(144,202,249,0.65)' : 'rgba(255,224,130,0.7)',
                    animation: `${dustDrift} ${650 + dot * 130}ms ease-out infinite`,
                    animationDelay: `${dot * 120}ms`,
                  }}
                />
              ))}
              <RocketLaunchIcon
                sx={{
                  color: '#e3f2fd',
                  display: 'block',
                  fontSize: { xs: 32, sm: 40 },
                  filter: 'drop-shadow(0 0 10px rgba(144,202,249,0.75))',
                  animation: `${rocketBob} 1s ease-in-out infinite`,
                }}
              />
            </Box>
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
            Launch
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {Math.round(boundedProgress)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Destination
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
