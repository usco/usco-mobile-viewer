export default function formatRawMachineData (rawData) {
  return {
    machine_volume: [
      rawData.machine_width,
      rawData.machine_depth,
      rawData.machine_height],
    machine_head_with_fans_polygon: [], // rawData.machine_head_with_fans_polygon.default_value,
    machine_disallowed_areas: [], // rawData.machine_disallowed_areas.default_value,
    machine_printable_area: []
  }
}
