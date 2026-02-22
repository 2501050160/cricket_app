/**
 * Physics engine for cricket ball trajectory reconstruction and prediction.
 */

export interface Vector3D {
  x: number; // Lateral (left/right)
  y: number; // Vertical (height)
  z: number; // Longitudinal (pitch length)
}

export interface TrajectoryPoint extends Vector3D {
  t: number;
  velocity?: Vector3D;
}

export const PITCH_LENGTH = 20.12; // meters
export const STUMP_HEIGHT = 0.711; // meters (28 inches)
export const STUMP_WIDTH = 0.2286; // meters (9 inches)
export const STUMP_RADIUS = 0.019; // meters (~0.75 inches radius)
export const BAIL_HEIGHT = 0.013; // meters
export const GRAVITY = 9.81; // m/s^2

export interface WicketVolume {
  min: Vector3D;
  max: Vector3D;
}

export const WICKET_VOLUME: WicketVolume = {
  min: { x: -STUMP_WIDTH / 2, y: 0, z: PITCH_LENGTH - 0.02 },
  max: { x: STUMP_WIDTH / 2, y: STUMP_HEIGHT + BAIL_HEIGHT, z: PITCH_LENGTH + 0.02 }
};

/**
 * Estimates 3D position from 2D pixel coordinates and known constraints.
 * This is a simplified version of the monocular reconstruction logic.
 */
export function reconstruct3D(
  pixelX: number,
  pixelY: number,
  frameWidth: number,
  frameHeight: number,
  time: number
): TrajectoryPoint {
  // In a real system, this would use camera calibration matrices.
  // Here we use a perspective projection model.
  
  // Normalized coordinates (-1 to 1)
  const nx = (pixelX / frameWidth) * 2 - 1;
  const ny = 1 - (pixelY / frameHeight) * 2;

  // Simple heuristic: as the ball moves along the pitch (Z), 
  // its Y position in pixels changes based on perspective.
  // We assume the camera is behind the bowler.
  
  const z = (time / 0.5) * PITCH_LENGTH; // Assume 0.5s delivery time for demo
  const x = nx * (z * 0.1); // Lateral spread increases with distance
  const y = (ny + 0.5) * 2; // Height estimation

  return { x, y, z, t: time };
}

/**
 * Predicts the future trajectory using projectile motion.
 */
export function predictTrajectory(
  points: TrajectoryPoint[],
  predictionTime: number = 1.0,
  step: number = 0.05
): TrajectoryPoint[] {
  if (points.length < 2) return [];

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const dt = last.t - prev.t;

  // Estimate current velocity
  const vx = (last.x - prev.x) / dt;
  const vy = (last.y - prev.y) / dt;
  const vz = (last.z - prev.z) / dt;

  const predictions: TrajectoryPoint[] = [];
  let currentTime = last.t;
  let currX = last.x;
  let currY = last.y;
  let currZ = last.z;
  let currVy = vy;

  while (currentTime < last.t + predictionTime && currZ < PITCH_LENGTH + 2) {
    currentTime += step;
    
    // Physics: x = x0 + v*t
    currX += vx * step;
    currZ += vz * step;
    
    // Vertical motion with gravity: y = y0 + v*t - 0.5*g*t^2
    currVy -= GRAVITY * step;
    currY += currVy * step;

    // Bounce logic (simplified)
    if (currY < 0) {
      currY = -currY * 0.6; // 60% energy retention
      currVy = -currVy * 0.6;
    }

    predictions.push({ x: currX, y: currY, z: currZ, t: currentTime });
  }

  return predictions;
}

/**
 * Checks if the trajectory hits the stumps using a 3D bounding volume.
 */
export function checkWicketImpact(points: TrajectoryPoint[]): {
  isHit: boolean;
  impactPoint?: Vector3D;
  partHit?: 'off' | 'middle' | 'leg' | 'bails' | 'none';
} {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i+1];
    
    // Check if the segment intersects the plane at z = PITCH_LENGTH
    if ((p1.z <= PITCH_LENGTH && p2.z >= PITCH_LENGTH) || (p1.z >= PITCH_LENGTH && p2.z <= PITCH_LENGTH)) {
      const ratio = Math.abs(PITCH_LENGTH - p1.z) / Math.abs(p2.z - p1.z);
      const impactX = p1.x + (p2.x - p1.x) * ratio;
      const impactY = p1.y + (p2.y - p1.y) * ratio;

      const inWidth = Math.abs(impactX) <= STUMP_WIDTH / 2 + STUMP_RADIUS;
      const inHeight = impactY >= 0 && impactY <= STUMP_HEIGHT + BAIL_HEIGHT;

      if (inWidth && inHeight) {
        let partHit: 'off' | 'middle' | 'leg' | 'bails' | 'none' = 'none';
        
        if (impactY > STUMP_HEIGHT) {
          partHit = 'bails';
        } else {
          // Determine which stump
          const offStumpX = STUMP_WIDTH / 2;
          const legStumpX = -STUMP_WIDTH / 2;
          
          if (Math.abs(impactX - offStumpX) <= STUMP_RADIUS * 1.5) partHit = 'off';
          else if (Math.abs(impactX - legStumpX) <= STUMP_RADIUS * 1.5) partHit = 'leg';
          else if (Math.abs(impactX) <= STUMP_RADIUS * 1.5) partHit = 'middle';
          else partHit = 'middle'; // Default to middle if between
        }

        return { 
          isHit: true, 
          impactPoint: { x: impactX, y: impactY, z: PITCH_LENGTH },
          partHit
        };
      }
    }
  }

  return { isHit: false, partHit: 'none' };
}
