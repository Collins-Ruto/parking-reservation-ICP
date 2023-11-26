# Parking Management System

## Overview

This smart contract implements a parking reservation system using the typescript on azle for internet Computer. The system allows for the initialization of an owner, addition of parking slots, allocation of parking spaces to clients, vallet delivery, and various operations on parking slots.

## Prerequisites

- Node
- Typescript
- DFX
- IC CDK

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/Collins-Ruto/parking-reservation-ICP.git
    cd parking-reservation-ICP
    ```

## Project Structure

The project is organized into the following directories and files:

- **`src/`**: Contains the source code for the parking management system.
  - **`index.ts`**: App entry point Implementation of the parking management system.

- **`node_modules/`**: Directory for project dependencies.

- **`package.json`**: Configuration file for npm, including project dependencies and scripts.

- **`tsconfig.json`**: TypeScript configuration file, specifying compiler options.

- **`LICENSE`**: MIT License file, detailing the terms under which the project is licensed.

- **`README.md`**: Project documentation providing an overview, installation instructions, usage details, and license information.

## Functions

### `initOwner(name: string): string`

- Initializes the system owner with a unique ID, name, and timestamp.
- There can only be one owner per contract.

### `getOwner(): Owner`

- Retrieves the details of the system owner.

### `getAvailableSlots(): Result<Vec<Parking>, string>`

- Retrieves a list of available parking slots.

### `addParkingSlot(payload: ParkingPayload): string`

- Adds a new parking slot to the system. Reserved for the contract owner.

### `getParkingSpace(payload: AllocationPayload): string`

- Allocates a parking space to a client, marking the slot as occupied.

### `valletDelivery(payload: ValletPayload): string`

- Handles vallet delivery, updating the total cost and client's location.

### `pickupCar(id: string): { msg: string; price: number }`

- Picks up a car from a parking slot, calculates the parking duration and cost.

### `updateParkingSlot(id: string, payload: ParkingPayload): string`

- Updates information for a parking slot, such as parking ID and price. Reserved for the contract owner.

### `deleteParkingSlot(id: string): string`

- Deletes a parking slot from the system. Reserved for the contract owner.

## Usage

- Initialize the owner using `initOwner(name)`.
- Add parking slots with `addParkingSlot(payload)`.
- Allocate parking spaces to clients using `getParkingSpace(payload)`.
- Manage vallet delivery with `valletDelivery(payload)`.
- Perform various operations on parking slots, including updates and deletions.

## Try it out

`dfx` is the tool you will use to interact with the IC locally and on mainnet. If you don't already have it installed:

```bash
npm run dfx_install
```

Next you will want to start a replica, which is a local instance of the IC that you can deploy your canisters to:

```bash
npm run replica_start
```

If you ever want to stop the replica:

```bash
npm run replica_stop
```

Now you can deploy your canister locally:

```bash
npm install
npm run canister_deploy_local
```

To call the methods on your canister:

```bash
npm run name_of_function
npm run name_of_function
```

Assuming you have [created a cycles wallet](https://internetcomputer.org/docs/current/developer-docs/quickstart/network-quickstart) and funded it with cycles, you can deploy to mainnet like this:

```bash
npm run canister_deploy_mainnet
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
