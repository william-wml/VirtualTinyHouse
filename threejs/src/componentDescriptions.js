// VtH public-facing component guide.
// Descriptions describe general framing functions, not engineering verification.
// Original model names and GLB metadata remain untouched.
const ROLES = Object.freeze({
  VTH_ROOF_FRAMING: ['Roof framing member', 'Part of the framing that forms and supports the roof structure.'],
  VTH_ROOF_BLOCKS: ['Roof blocking', 'Short framing pieces used between roof members for local support and connection.'],
  VTH_ROOF_COVERING: ['Roof covering', 'The outer layer of the roof assembly.'],
  VTH_WALL_STUDS: ['Wall stud', 'A vertical framing member forming part of a wall.'],
  VTH_WALL_PLATES: ['Wall plate', 'Horizontal framing that connects and aligns the wall members.'],
  VTH_WALL_HEADERS: ['Opening header', 'Framing above a wall opening that helps transfer loads to its supports.'],
  VTH_WALL_BLOCKS: ['Wall blocking', 'Short framing used around openings or between wall members.'],
  VTH_FLOOR_JOISTS: ['Floor joist', 'A framing member that supports the floor across its span.'],
  VTH_FLOOR_BLOCKS: ['Floor blocking', 'Short framing between floor members that provides local restraint or support.'],
  VTH_FLOOR_HANGERS: ['Joist hanger', 'A metal connector used at a supported end of a floor joist.'],
  VTH_FLOOR_SUBFLOOR: ['Subfloor', 'The structural sheet layer above the floor framing.'],
  VTH_FLOOR_LEDGERS: ['Floor ledger', 'A supporting member connected along the inside of the perimeter framing.'],
  VTH_BUILT_UP_BEAMS: ['Built-up perimeter beam', 'Layered framing that forms part of the supporting perimeter.'],
  VTH_CASTERS: ['Caster assembly component', 'Part of the wheel assembly that allows VtH to be repositioned.'],
  VTH_SADDLES: ['Steel caster saddle', 'A steel interface between the caster assembly and timber framing.'],
  VTH_FASTENERS_LEDGER: ['Ledger fastener', 'A mechanical fastener used in the ledger connection.'],
  VTH_FASTENERS_PLATES: ['Plate fastener', 'A mechanical fastener joining framing plates or supporting members.'],
  VTH_FASTENERS_OTHER: ['Structural fastener', 'One of the mechanical connectors represented in the model.'],
});
const safe = value => typeof value === 'string' ? value : '';

export function describeComponent(object, entry) {
  if (!object || !entry) return null;
  const data = object.userData || {};
  const leaf = safe(data.vth_category);
  const source = safe(data.vth_source_object) || safe(object.name);
  if (data.vth_component_role === 'WINDOW_ROUGH_SILL') {
    return { title: 'Window rough sill', description: 'Horizontal framing at the lower edge of a window opening.', leaf };
  }
  if (leaf === 'VTH_CASTERS') {
    if (/mounting[ _-]*plate/i.test(source)) return { title: 'Caster mounting plate', description: 'A metal plate forming the mounting connection for a caster assembly.', leaf };
    if (/wheel/i.test(source)) return { title: 'Caster wheel', description: 'The rolling part of the caster assembly that supports movement.', leaf };
  }
  if (leaf.startsWith('VTH_FASTENERS_')) {
    if (/washer/i.test(source)) return { title: 'Washer', description: 'Distributes pressure beneath a bolt head or nut at a connection.', leaf };
    if (/lock[ _-]*nut/i.test(source)) return { title: 'Lock nut', description: 'A nut designed to resist loosening at a bolted connection.', leaf };
    if (/\bnut\b/i.test(source)) return { title: 'Nut', description: 'A threaded component used with a bolt to secure a connection.', leaf };
    if (/screw|hex[ _-]*cap|\bbolt\b/i.test(source)) return { title: 'Screw or bolt', description: 'A mechanical fastener used to connect structural components.', leaf };
  }
  const description = ROLES[leaf];
  if (description) return { title: description[0], description: description[1], leaf };
  return { title: 'Structural component', description: 'Select and inspect this part within the VtH assembly.', leaf };
}
