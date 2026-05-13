"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ComponentProps } from "react";
import type { Location, Property, PropertyFilters } from "@/types";
import { LISTING_TYPE_LABELS } from "@/features/properties/lib/propertyOptions";
import { formatPrice } from "@/features/properties/lib/formatPrice";

const MapContainer = dynamic(
  () => import("react-leaflet").then((module) => module.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((module) => module.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((module) => module.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((module) => module.Popup),
  { ssr: false },
);

type MapContainerProps = ComponentProps<
  Awaited<typeof import("react-leaflet")>["MapContainer"]
>;

interface PropertyMapProps {
  properties: Property[];
  filters: PropertyFilters;
  locations: Location[];
}

type LocationWithCoords = Location & {
  latitude: number;
  longitude: number;
};

const LAGOS_CENTER: MapContainerProps["center"] = [6.5244, 3.3792];
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

function hasCoords(location: Location | undefined): location is LocationWithCoords {
  return Boolean(
    location?.latitude &&
      location?.longitude &&
      location.latitude !== 0 &&
      location.longitude !== 0,
  );
}

function hasMappedLocation(
  item: { property: Property; location: Location | undefined },
): item is { property: Property; location: LocationWithCoords } {
  return hasCoords(item.location);
}

function propertyTypeLabel(property: Property) {
  return property.property_type_id
    ? `Type #${property.property_type_id}`
    : "Property";
}

function isUserVisibleFilter([key, value]: [string, unknown]) {
  return (
    !["skip", "limit", "moderation_status"].includes(key) &&
    value !== undefined &&
    value !== "" &&
    value !== null
  );
}

export function PropertyMap({ properties, filters, locations }: PropertyMapProps) {
  const locationById = new Map(
    locations.map((location) => [location.location_id, location]),
  );
  const mappedProperties = properties
    .map((property) => ({
      property,
      location: property.location_id
        ? locationById.get(property.location_id)
        : undefined,
    }))
    .filter(hasMappedLocation);
  const unmappedProperties = properties.filter((property) => {
    const location = property.location_id
      ? locationById.get(property.location_id)
      : undefined;

    return !hasCoords(location);
  });
  const mapCenter =
    mappedProperties[0]?.location?.latitude && mappedProperties[0]?.location?.longitude
      ? ([
          mappedProperties[0].location.latitude,
          mappedProperties[0].location.longitude,
        ] as MapContainerProps["center"])
      : LAGOS_CENTER;
  const activeFilterCount = Object.entries(filters).filter(isUserVisibleFilter).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <MapContainer
          center={mapCenter}
          zoom={12}
          scrollWheelZoom
          className="h-[calc(100vh-220px)] min-h-[28rem] w-full"
        >
          <TileLayer
            attribution={OSM_ATTRIBUTION}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappedProperties.map(({ property, location }) => (
            <Marker
              key={property.property_id}
              position={[location.latitude, location.longitude]}
            >
              <Popup>
                <div className="w-56 space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {property.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatPrice(property.price, property.price_currency ?? "NGN")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {property.bedrooms ?? 0} bed -{" "}
                    {LISTING_TYPE_LABELS[property.listing_type] ??
                      propertyTypeLabel(property)}
                  </p>
                  <Link
                    href={`/properties/${property.property_id}`}
                    className="mt-1 block text-xs font-medium text-blue-600 underline"
                  >
                    View listing -&gt;
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Map results
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mappedProperties.length} mapped listing
            {mappedProperties.length === 1 ? "" : "s"} from {properties.length} result
            {properties.length === 1 ? "" : "s"}
            {activeFilterCount > 0 ? ` using ${activeFilterCount} active filters` : ""}
          </p>
        </div>

        {unmappedProperties.length > 0 ? (
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              {unmappedProperties.length} listing
              {unmappedProperties.length > 1 ? "s" : ""} without map location
            </p>
            <div className="space-y-2">
              {unmappedProperties.map((property) => (
                <Link
                  key={property.property_id}
                  href={`/properties/${property.property_id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:underline dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {property.title} -{" "}
                  {formatPrice(property.price, property.price_currency ?? "NGN")}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
