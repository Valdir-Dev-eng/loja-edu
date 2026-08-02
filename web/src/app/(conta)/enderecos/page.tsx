import { getMyAddresses } from "@/lib/account-data";
import { AddressesClient } from "./addresses-client";

export default async function EnderecosPage() {
  const addresses = await getMyAddresses();
  return <AddressesClient initialAddresses={addresses} />;
}
