# Parachute Skydiving Physics - Complete Reference for Three.js Implementation

## Table of Contents
1. [Forces Acting on the Parachutist](#forces-acting-on-the-parachutist)
2. [Environmental Physics](#environmental-physics)
3. [Parachute Types and Aerodynamics](#parachute-types-and-aerodynamics)
4. [Motion Equations](#motion-equations)
5. [Terminal Velocity](#terminal-velocity)
6. [Steering and Control](#steering-and-control)
7. [Implementation Constants](#implementation-constants)
8. [Simulation Algorithm](#simulation-algorithm)

## Forces Acting on the Parachutist

### 1. Gravitational Force
The fundamental downward force affecting the parachutist.

**Formula:**
```
F_gravity = m * g
```

**Vector Form:**
```
F_gravity_vector = -m * g * j_hat
```

**Parameters:**
- `m`: Mass of the falling body (kg)
- `g`: Earth's gravitational acceleration (9.81 m/s²)
- Direction: Always downward (negative Y-axis)

### 2. Air Resistance (Drag Force)
Opposes the motion of the body during fall, increases with the square of velocity.

**Linear Formula:**
```
F_drag = (1/2) * C_dv * A * ρ * V²
```

**Vector Form (with direction):**
```
F_drag_vector = -(1/2) * C_dv * A * ρ * v_vector * |v_vector|
```

**Parameters:**
- `C_dv`: Vertical drag coefficient
  - Before parachute opens: 0.7
  - After parachute opens: 1.75
- `A`: Surface area of the falling body (m²)
- `ρ`: Air density (kg/m³)
- `V`: Instantaneous velocity (m/s)
- `v_vector`: Velocity vector relative to air
- `|v_vector|`: Magnitude of velocity vector

### 3. Wind Force
Horizontal force caused by wind affecting the parachutist's trajectory.

**Linear Formula:**
```
F_wind = (1/2) * C_dh * A * ρ * V_wind²
```

**Vector Form (considering relative velocity):**
```
F_wind_vector = (1/2) * C_dh * A * ρ * v_rel * |v_rel|
```

**Parameters:**
- `C_dh`: Horizontal drag coefficient
  - Before parachute opens: 1.0
  - After parachute opens: 1.2
- `v_rel`: Relative velocity between parachutist and wind
- `V_wind`: Wind speed (m/s)

### 4. Rope Tension Force
Appears when the parachute opens, provides balance between drag and gravity.

**Conditions:**
- **Before parachute opens:** T = 0 (negligible)
- **During parachute opening:** T = m * (g + a) (large initial value)
- **After stabilization:** T = m * g (steady state)

**Vector Form:**
```
T_vector = T * j_hat (upward direction)
```

## Environmental Physics

### Temperature Calculation
Temperature varies with altitude according to the standard atmosphere model.

**Formula:**
```
T = T₀ - 0.0065 * h
```

**Parameters:**
- `T₀`: Sea level temperature = 15°C
- `h`: Altitude in meters
- `T`: Temperature at altitude h

**Celsius to Kelvin conversion:**
```
T_kelvin = T_celsius + 273.15
```

### Air Pressure Calculation
Atmospheric pressure decreases exponentially with altitude.

**Formula:**
```
P = P₀ * e^(-M*G*H/(R*T))
```

**Parameters:**
- `P₀`: Sea level pressure = 101.325 kPa
- `M`: Molar mass of air = 28.97 g/mol
- `G`: Gravitational acceleration = 9.81 m/s²
- `H`: Altitude (m)
- `R`: Universal gas constant = 8.31 J/(mol*K)
- `T`: Temperature at altitude H

### Air Density Calculation
Air density is calculated using the ideal gas law.

**Formula:**
```
ρ = (P * M) / (R * T)
```

**Parameters:**
- `P`: Air pressure (Pa)
- `M`: Molar mass of air = 28.97 g/mol
- `R`: Universal gas constant = 8.31 J/(mol*K)
- `T`: Temperature in Kelvin

## Parachute Types and Aerodynamics

### Circular Parachute
Traditional round parachute design.

**Surface Area:**
```
A = π * r²
```
- `r`: Parachute radius

### Rectangular Parachute
Modern ram-air parachute with better lift characteristics.

**Surface Area:**
```
A = l * w
```
- `l`: Length
- `w`: Width

**Lift Force:**
```
F_lift = (1/2) * C_dv * A * ρ * V²
```

## Motion Equations

### Resultant Force
The total force acting on the parachutist.

**Vector Form:**
```
F_total = F_gravity + F_drag + F_wind + F_tension
```

### Newton's Second Law Application

**Vertical Motion (Y-axis):**
```
F_y = m * a_y
F_y = F_gravity_y - F_drag_y
a_y = F_y / m
```

**Horizontal Motion (X and Z axes):**
```
F_x = m * a_x = F_wind_x - F_drag_x
F_z = m * a_z = F_wind_z - F_drag_z

a_x = F_x / m
a_z = F_z / m
```

### Velocity Integration
Update velocity using acceleration over time step.

```
V_y = a_y * dt
V_x = a_x * dt
V_z = a_z * dt
```

**Instantaneous velocity (from initial conditions):**
```
v = v₀ + a*t
```

Since initial velocity is zero:
```
v_x = a_x * t
v_y = a_y * t
v_z = a_z * t
```

## Terminal Velocity

Terminal velocity occurs when acceleration becomes zero (a = 0) and velocity becomes constant.

**Formula:**
```
V_max = √(2*m*g / (ρ*A*C_d))
```

**At terminal velocity:**
```
W - T = 0
T = W = m * g
```

## Steering and Control

### Control Mechanism
Parachutists control direction by pulling steering lines, which:
1. Deforms the parachute's symmetrical shape
2. Reduces air pressure under the pulled side
3. Creates asymmetric lift forces
4. Generates rotational torque

### Torque Calculation
**Formula:**
```
τ = ΔF * r
```

**Parameters:**
- `τ`: Rotational torque
- `ΔF`: Difference in lift force between parachute sides
- `r`: Distance from pulled cord to parachute center

### Angular Motion
**Angular velocity relationship:**
```
τ/I = dθ/dt = ω
```

**Angular acceleration:**
```
τ/I = dω/dt = α
```

**Parameters:**
- `I`: Moment of inertia
- `θ`: Angle in radians
- `ω`: Angular velocity
- `α`: Angular acceleration

## Implementation Constants

### Physical Constants
```javascript
const PHYSICS_CONSTANTS = {
    // Environmental
    GRAVITY: 9.81,                    // m/s²
    SEA_LEVEL_TEMP: 15,              // °C
    SEA_LEVEL_PRESSURE: 101325,      // Pa
    TEMP_LAPSE_RATE: 0.0065,         // °C/m
    AIR_MOLAR_MASS: 0.02897,         // kg/mol
    GAS_CONSTANT: 8.314,             // J/(mol*K)
    
    // Drag Coefficients
    DRAG_COEFF_VERTICAL_FREEFALL: 0.7,
    DRAG_COEFF_VERTICAL_PARACHUTE: 1.75,
    DRAG_COEFF_HORIZONTAL_FREEFALL: 1.0,
    DRAG_COEFF_HORIZONTAL_PARACHUTE: 1.2,
    
    // Typical Values
    PARACHUTIST_MASS: 80,            // kg
    PARACHUTIST_AREA: 0.7,           // m²
    PARACHUTE_AREA_ROUND: 50,        // m²
    PARACHUTE_AREA_RECT: 25          // m²
};
```

## Simulation Algorithm

### Time Step Integration
For Three.js implementation, use a time-stepping approach:

```javascript
function updatePhysics(deltaTime) {
    // 1. Calculate environmental conditions
    const temperature = calculateTemperature(altitude);
    const pressure = calculatePressure(altitude, temperature);
    const airDensity = calculateAirDensity(pressure, temperature);
    
    // 2. Calculate forces
    const gravityForce = calculateGravity(mass);
    const dragForce = calculateDrag(velocity, airDensity, area, dragCoeff);
    const windForce = calculateWind(windVelocity, airDensity, area);
    const tensionForce = calculateTension(parachuteOpen, mass);
    
    // 3. Calculate resultant force and acceleration
    const totalForce = gravityForce.add(dragForce).add(windForce).add(tensionForce);
    const acceleration = totalForce.divideScalar(mass);
    
    // 4. Integrate velocity and position
    velocity.addScaledVector(acceleration, deltaTime);
    position.addScaledVector(velocity, deltaTime);
    
    // 5. Update altitude
    altitude = position.y;
}
```

### Key Implementation Notes

1. **Coordinate System:** Use Y-up coordinate system typical in Three.js
2. **Units:** Maintain consistent SI units (meters, seconds, kilograms)
3. **Time Step:** Use small time steps (0.016s for 60 FPS) for stability
4. **Vector Operations:** Utilize Three.js Vector3 class for all vector calculations
5. **Performance:** Pre-calculate constants and cache frequently used values

### Parachute State Machine
```javascript
const ParachuteState = {
    FREEFALL: 'freefall',
    OPENING: 'opening', 
    DEPLOYED: 'deployed'
};
```

### Wind Simulation
Consider implementing variable wind patterns:
- Constant wind
- Turbulence (random variations)
- Altitude-dependent wind layers
- Thermal updrafts

This physics reference provides the complete mathematical foundation needed to create a realistic parachute skydiving simulation in Three.js, covering all aspects from basic forces to advanced steering mechanics.