import { useCallback } from "react";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { findVehicleDesign, type VehicleModel } from "./vehicle-designs.js";

export interface VehicleLook {
  model: VehicleModel;
  colour: string;
}

export const VehicleFigure = ({ vehicle }: { vehicle: VehicleLook }) => {
  const geometry = useBuiltGeometry(
    useCallback(() => {
      const design = findVehicleDesign(vehicle.model);
      if (design === undefined) {
        throw new Error(`No vehicle design for "${vehicle.model}"`);
      }
      return design.buildGeometry(vehicle.colour);
    }, [vehicle.model, vehicle.colour]),
  );
  return (
    <mesh name={`vehicle-${vehicle.model}`} geometry={geometry} castShadow>
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.05} />
    </mesh>
  );
};
