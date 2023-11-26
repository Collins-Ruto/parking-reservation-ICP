// Importing necessary modules from the 'azle' library and 'uuid' library
import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from "uuid";

// Defining record types for different entities
type Owner = Record<{
  id: string;
  name: string;
  owner: Principal;
  created_date: nat64;
  updated_at: Opt<nat64>;
}>;

type Parking = Record<{
  id: string;
  parking_slot: string;
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

type Valet = Record<{
  id: string;
  allocation: string;
  client_location: string;
  created_date: nat64;
  updated_at: Opt<nat64>;
}>;

type ParkingPayload = Record<{
  parking_slot: string;
  price: string;
}>;

type AllocationPayload = Record<{
  parking_id: string;
  car_model: string;
}>;

type ValetPayload = Record<{
  allocation_id: string;
  client_location: string;
}>;

type CarResponse = Record<{
  msg: string;
  price: number;
}>;

// Creating instances of StableBTreeMap for each entity type
const ownerStorage = new StableBTreeMap<string, Owner>(0, 44, 512);
const allocationStorage = new StableBTreeMap<string, Allocation>(1, 44, 512);
const valetStorage = new StableBTreeMap<string, Valet>(2, 44, 512);
const parkingStorage = new StableBTreeMap<string, Parking>(3, 44, 512);

// Initialization of ownerStorage
$update;
export function initOwner(name: string): string {
  if (!ownerStorage.isEmpty()) {
    return `Owner has already been initialized`;
  }
  const owner = {
    id: uuidv4(),
    name: name,
    owner: ic.caller(),
    created_date: ic.time(),
    updated_at: Opt.None,
  };
  ownerStorage.insert(owner.id, owner);
  return owner.id;
}

$query;
// Function to get available parking slots
export function getAvailableSlots(): Result<Vec<Parking>, string> {
  const slots = parkingStorage.values().filter((slot) => !slot.is_occupied);
  if (slots.length == 0) {
    return Result.Err("No available parking slots currently");
  }
  return Result.Ok(slots);
}

$update;
// Function to add a new parking slot
export function addParkingSlot(payload: ParkingPayload): string {
  if (ownerStorage.isEmpty()) {
    initOwner("cbd parking");
  }
  
  if (isOwner(ic.caller().toText())) {
    return `Action reserved for the contract owner`;
  }
  const parking = {
    id: uuidv4(),
    parking_slot: payload.parking_slot,
    is_occupied: false,
    price: payload.price,
    created_date: ic.time(),
    updated_at: Opt.None,
  };
  parkingStorage.insert(parking.id, parking);
  return parking.id;
}

// Function to check if person making the request is the owner
function isOwner(caller: string): boolean {
    const owner = ownerStorage.values()[0];
    return owner.owner.toText() != caller;
}

$update;
// Function to allocate a parking space to a client
export function getParkingSpace(payload: AllocationPayload): string {
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
  return `Your Parking ID: ${allocation.id} your Slot: ${parking.parking_slot}`;
}

$query;
// Function to pick up a car from a parking slot and paying for it
export function pickupCar(id: string): CarResponse {
  return match(allocationStorage.get(id), {
    Some: (allocation) => {
      if (allocation.client.toText() != ic.caller().toText()) {
        return {
          msg: "You are not the owner of the car in the slot. re-check the slot number",
          price: 0,
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
        (Number(ic.time()) - Number(allocation.created_date)) / (3600000000000);
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

$update;
// Function to handle valet delivery and add valet payment
export function valetDelivery(payload: ValetPayload): string {
  const price = pickupCar(payload.allocation_id).price;
  const valet = {
    id: uuidv4(),
    allocation: payload.allocation_id,
    client_location: payload.client_location,
    created_date: ic.time(),
    updated_at: Opt.None,
  };
  valetStorage.insert(valet.id, valet);
  return `Your car will be delivered to ${
    valet.client_location
  } new total cost: \$${price + 5}`;
}

$update;
// Function to update information for a parking slot
export function updateParkingSlot(id: string, payload: ParkingPayload): string {
  if (isOwner(ic.caller().toText())) {
    return "Action reserved for the contract owner";
  }
  const parking = match(parkingStorage.get(id), {
    Some: (parking) => parking,
    None: () => ({} as unknown as Parking),
  });
  if (parking) {
    parking.parking_slot = payload.parking_slot;
    parking.price = payload.price;
    parking.updated_at = Opt.Some(ic.time());
    parkingStorage.insert(parking.id, parking);
  }
  return parking.id;
}

$update;
// Function to delete a parking slot
export function deleteParkingSlot(id: string): string {
  if (isOwner(ic.caller().toText())) {
    return "Action reserved for the contract owner";
  }
  parkingStorage.remove(id);
  return `Parking slot of ID: ${id} removed successfully`;
}

// Mocking the 'crypto' object for testing purposes
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
