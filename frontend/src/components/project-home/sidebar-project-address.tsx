"use client";

import * as React from "react";

interface SidebarProjectAddressProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export function SidebarProjectAddress({
  address,
  city,
  state,
  zip,
  country = "United States",
}: SidebarProjectAddressProps) {
  return (
    <div className="bg-background rounded-md border border-border p-4">
      {/* eslint-disable-next-line design-system/no-raw-heading */}
      <h3 className="text-sm font-semibold text-foreground mb-2">
        Project Address
      </h3>
      <p className="text-sm text-foreground">
        {address}
        <br />
        {city}, {state} {zip}
        <br />
        {country}
      </p>
    </div>
  );
}
