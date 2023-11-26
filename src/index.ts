import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type Parking = Record<{
  id: string;
  parking_id: string;
  is_occupied: boolean;
  price: string;
  created_date: nat64;
  updated_at: Opt<nat64>;
}>;

type Allocation = Record<{
  id: string;
  parking_id: string;
  client: Principal;
  car_model: string;
  created_date: nat64;
}>;

type Vallet = Record<{
  id: string;
  allocation: string;
  client_location: string;
  created_date: nat64;
  updated_at: Opt<nat64>;
}>;

type ParkingPayload = Record<{
  parking_id: string;
  price: string;
}>;

type AllocationPayload = Record<{
  parking_id: string;
  car_model: string;
}>;

type ValletPayload = Record<{
  allocation_id: string;
  client_location: string;
}>;

const parkingStorage = new StableBTreeMap<string, Parking>(0, 44, 512);
const allocationStorage = new StableBTreeMap<string, Allocation>(1, 44, 512);
const valletStorage = new StableBTreeMap<string, Vallet>(2, 44, 512);

$query;
export function getAvailableSlots(): Result<Vec<Parking>, string> {
  const slots = parkingStorage.values();
  slots.filter((slot) => !slot.is_occupied);
  return Result.Ok(slots);
}

$update;
export function addParkingSlot(payload: ParkingPayload): string {
  const parking = {
    id: uuidv4(),
    parking_id: payload.parking_id,
    is_occupied: false,
    price: payload.price,
    created_date: ic.time(),
    updated_at: Opt.None,
  };
  parkingStorage.insert(parking.id, parking);
  return parking.id;
}

$update;
export function addAllocation(payload: AllocationPayload): string {
  const allocation = {
    id: uuidv4(),
    parking_id: payload.parking_id,
    client: ic.caller(),
    car_model: payload.car_model,
    created_date: ic.time(),
    updated_at: Opt.None,
  };
  allocationStorage.insert(allocation.id, allocation);

  const parking = match(parkingStorage.get(payload.parking_id), {
    Some: (parking) => parking,
    None: () => ({} as unknown as Parking),
  });
  if (parking) {
    parking.is_occupied = true;
    parkingStorage.insert(parking.id, parking);
  }
  return `Your Parking ID: ${allocation.id} your Slot: ${allocation.parking_id}`;
}

$update;
export function addVallet(payload: ValletPayload): string {
  const price = pickupCar(payload.allocation_id).price;
  const vallet = {
    id: uuidv4(),
    allocation: payload.allocation_id,
    client_location: payload.client_location,
    created_date: ic.time(),
    updated_at: Opt.None,
  };
    valletStorage.insert(vallet.id, vallet);
  return `Your car will be delivered to ${vallet.client_location} new total cost: \$${price + 5}`;
}

$query;
export function pickupCar(id: string): { msg: string; price: number } {
  return match(allocationStorage.get(id), {
    Some: (allocation) => {
      if (allocation.client != ic.caller()) {
        return {
            msg: "You are not the owner of the car in the slot. re-check the slot number",
            price: 0
        };
      }
      const parking = match(parkingStorage.get(allocation.parking_id), {
        Some: (parking) => parking,
        None: () => ({} as unknown as Parking),
      });
      if (parking) {
        parking.is_occupied = false;
        parkingStorage.insert(parking.id, parking);
      }
      const time =
        (Number(allocation.created_date) - Date.now()) / (3600 * 1000);
      const price = parseInt(parking.price) * time;
      return {
        msg: `You have parked for : ${time} Hrs. final cost: \$${price}`,
        price: price,
      };
    },
    None: () => {
      return {
        msg: `We can't find a car stored in that slot. Contact HR`,
        price: 0,
      };
    },
  });
}
