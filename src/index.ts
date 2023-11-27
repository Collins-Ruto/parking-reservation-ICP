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
export function initOwner(name: string): Result<Owner, string> {
  try {
    // Validate that the owner has not been initialized already
    if (!ownerStorage.isEmpty()) {
      return Result.Err<Owner, string>('Owner has already been initialized');
    }

    // Validate that the provided name is not empty
    if (!name) {
      return Result.Err<Owner, string>('Name cannot be empty');
    }

    // Create a new owner
    const owner: Owner = {
      id: uuidv4(),
      name: name,
      owner: ic.caller(),
      created_date: ic.time(),
      updated_at: Opt.None,
    };

    // Insert the owner into ownerStorage
    ownerStorage.insert(owner.id, owner);

    return Result.Ok(owner);
  } catch (error) {
    return Result.Err<Owner, string>('Failed to initialize owner');
  }
}

$query;
// Function to get available parking slots
export function getAvailableSlots(): Result<Vec<Parking>, string> {
  try {
    const slots = parkingStorage.values().filter((slot) => !slot.is_occupied);

    // Check if there are available parking slots
    if (slots.length === 0) {
      return Result.Err("No available parking slots currently");
    }

    return Result.Ok(slots);
  } catch (error) {
    return Result.Err('Failed to get available parking slots');
  }
}

$update;
// Function to add a new parking slot
export function addParkingSlot(payload: ParkingPayload): Result<string, string> {
  try {
    // Validate that the owner exists
    if (ownerStorage.isEmpty()) {
      return Result.Err('Owner has not been initialized');
    }

    // Check if the caller is the contract owner
    if (isOwner(ic.caller().toText())) {
      return Result.Err('Action reserved for the contract owner');
    }

    // Validate the payload
    if (!payload.parking_slot || !payload.price) {
      return Result.Err('Incomplete input data!');
    }

    // Create a new parking slot
    const parking: Parking = {
      id: uuidv4(),
      parking_slot: payload.parking_slot,
      is_occupied: false,
      price: payload.price,
      created_date: ic.time(),
      updated_at: Opt.None,
    };

    // Insert the parking slot into parkingStorage
    parkingStorage.insert(parking.id, parking);

    return Result.Ok(parking.id);
  } catch (error) {
    return Result.Err('Failed to add parking slot');
  }
}

// Function to check if the person making the request is the owner
function isOwner(caller: string): boolean {
  const owner = ownerStorage.values()[0];
  return owner.owner.toText() !== caller;
}

$update;
// Function to allocate a parking space to a client
export function getParkingSpace(payload: AllocationPayload): Result<string, string> {
  try {
    // Validate the payload
    if (!payload.parking_id || !payload.car_model) {
      return Result.Err('Incomplete input data!');
    }

    // Create a new allocation
    const allocation: Allocation = {
      id: uuidv4(),
      parking_id: payload.parking_id,
      client: ic.caller(),
      car_model: payload.car_model,
      created_date: ic.time(),
    };

    // Insert the allocation into allocationStorage
    allocationStorage.insert(allocation.id, allocation);

    // Update the parking slot status to occupied
    const parking = match(parkingStorage.get(payload.parking_id), {
      Some: (parking) => parking,
      None: () => ({} as unknown as Parking),
    });
    if (parking) {
      parking.is_occupied = true;
      parkingStorage.insert(parking.id, parking);
    }
    return Result.Ok(`Your Parking ID: ${allocation.id} your Slot: ${parking}`);
  } catch (error) {
    return Result.Err('Failed to allocate parking space');
  }
}

// Function to pick up a car from a parking slot and pay for it
// Function to pick up a car from a parking slot and pay for it
$query;
export function pickupCar(id: string): Result<CarResponse, string> {
  try {
    // Validate the ID
    if (!id) {
      return Result.Err('Invalid ID');
    }

    // Get the allocation
    const allocation = allocationStorage.get(id);

    // Check if the allocation exists
    return match(allocation, {
      Some: (allocation) => {
        // Check if the caller is the owner of the car
        return allocation.client.toText() === ic.caller().toText()
          ? match(parkingStorage.get(allocation.parking_id), {
            Some: (parking) => {
              // Update the parking slot status to unoccupied
              parking.is_occupied = false;
              parkingStorage.insert(parking.id, parking);

              // Calculate the parking duration and price
              const time =
                (Number(ic.time()) - Number(allocation.created_date)) /
                3600000000000;
              const price = parseInt(parking.price) * time;

              return Result.Ok<CarResponse, string>({
                msg: `You have parked for: ${time} Hrs. Final cost: \$${price}`,
                price: price,
              });
            },
            None: () =>
              Result.Err<CarResponse, string>('Parking slot not found'),
          })
          : Result.Err<CarResponse, string>('You are not the owner of the car in the slot. Re-check the slot number');
      },
      None: () => Result.Err<CarResponse, string>('Allocation not found'),
    });
  } catch (error) {
    return Result.Err<CarResponse, string>('Failed to pick up car');
  }
}

$update;
// Function to handle valet delivery and add valet payment
export function valetDelivery(payload: ValetPayload): Result<string, string> {
  try {
    // Validate the payload
    if (!payload.allocation_id || !payload.client_location) {
      return Result.Err('Incomplete input data!');
    }

    // Get the result from pickupCar function
    const pickupCarResult = pickupCar(payload.allocation_id);

    // Use match to handle the Result type
    return match(pickupCarResult, {
      Ok: (carResponse) => {
        const price = carResponse.price;

        // Create a new valet
        const valet: Valet = {
          id: uuidv4(),
          allocation: payload.allocation_id,
          client_location: payload.client_location,
          created_date: ic.time(),
          updated_at: Opt.None,
        };

        // Insert the valet into valetStorage
        valetStorage.insert(valet.id, valet);

        return Result.Ok<string, string>(`Your car will be delivered to ${valet.client_location} new total cost: \$${price + 5}`);
      },
      Err: (errMsg) => Result.Err<string, string>(`Failed to handle valet delivery: ${errMsg}`),
    });
  } catch (error) {
    return Result.Err<string, string>('Failed to handle valet delivery');
  }
}

$update;
// Function to update information for a parking slot
export function updateParkingSlot(id: string, payload: ParkingPayload): Result<string, string> {
  try {
    // Validate the ID
    if (!id) {
      return Result.Err('Invalid ID');
    }

    // Check if the caller is the contract owner
    if (isOwner(ic.caller().toText())) {
      return Result.Err('Action reserved for the contract owner');
    }

    // Validate the payload
    if (!payload.parking_slot || !payload.price) {
      return Result.Err('Incomplete input data!');
    }

    // Get the parking slot
    const parkingResult = parkingStorage.get(id);

    // Use match to handle the Result type
    return match(parkingResult, {
      Some: (parking) => {
        // Update the parking slot information
        parking.parking_slot = payload.parking_slot;
        parking.price = payload.price;
        parking.updated_at = Opt.Some(ic.time());

        // Insert the updated parking slot into parkingStorage
        parkingStorage.insert(parking.id, parking);

        return Result.Ok<string, string>(parking.id);
      },
      None: () => Result.Err<string, string>('Parking slot not found'),
    });
  } catch (error) {
    return Result.Err<string, string>('Failed to update parking slot');
  }
}

$update;
// Function to delete a parking slot
export function deleteParkingSlot(id: string): Result<string, string> {
  try {
    // Validate the ID
    if (!id) {
      return Result.Err('Invalid ID');
    }

    // Check if the caller is the contract owner
    if (isOwner(ic.caller().toText())) {
      return Result.Err('Action reserved for the contract owner');
    }

    // Remove the parking slot from parkingStorage
    parkingStorage.remove(id);

    return Result.Ok(`Parking slot of ID: ${id} removed successfully`);
  } catch (error) {
    return Result.Err('Failed to delete parking slot');
  }
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
