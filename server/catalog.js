/**
 * Catalogue of everything the sales team fills in.
 *
 * Both the mobile form and the e-mail builder are generated from this file, so a
 * new product line or an extra question only ever has to be added here.
 *
 * Field types understood by the front-end: text | textarea | number | date |
 * tel | email | select | multiselect | checkbox
 */

const COMPANY = {
  name: 'Water Secret Contracting',
  shortName: 'Water Secret',
  tagline: 'Sales Opportunity Registration',
};

/** Step 1 - who the client is and what the job is. */
const OPPORTUNITY_SECTIONS = [
  {
    id: 'client',
    title: 'Client details',
    icon: 'building',
    fields: [
      { name: 'clientCompany', label: 'Client / company name', type: 'text', required: true, placeholder: 'e.g. Nesma & Partners' },
      { name: 'clientType', label: 'Client type', type: 'select', required: true, options: ['Main contractor', 'Sub contractor', 'Consultant', 'Developer', 'Facility management', 'Government / authority', 'End user / owner', 'Other'] },
      { name: 'contactName', label: 'Contact person', type: 'text', required: true },
      { name: 'contactPosition', label: 'Position', type: 'text', placeholder: 'e.g. Procurement Manager' },
      { name: 'contactPhone', label: 'Mobile number', type: 'tel', required: true, placeholder: '+966 5X XXX XXXX' },
      { name: 'contactEmail', label: 'E-mail', type: 'email', required: true },
    ],
  },
  {
    id: 'project',
    title: 'Project details',
    icon: 'project',
    fields: [
      { name: 'projectName', label: 'Project name', type: 'text', required: true, placeholder: 'e.g. Riyadh North Labour Village Ph.2' },
      { name: 'projectLocation', label: 'City / district', type: 'text', required: true, placeholder: 'e.g. Jeddah - Obhur, Jubail Industrial City' },
      {
        name: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        hint: 'The 13 regions of the Kingdom',
        options: [
          'Riyadh',
          'Makkah',
          'Madinah',
          'Qassim',
          'Eastern Province',
          'Asir',
          'Tabuk',
          'Hail',
          'Northern Borders',
          'Jazan',
          'Najran',
          'Al Bahah',
          'Al Jouf',
          'Other GCC',
          'Outside GCC',
        ],
      },
      { name: 'projectStage', label: 'Project stage', type: 'select', required: true, options: ['Concept / feasibility', 'Design', 'Tender', 'Awarded - procurement', 'Under construction', 'Existing facility / retrofit'] },
      { name: 'scopeType', label: 'Scope required from us', type: 'multiselect', options: ['Supply only', 'Supply & installation', 'Design & build', 'O & M / service', 'Spare parts', 'Consultancy / study'] },
      { name: 'submissionDeadline', label: 'Offer / submission deadline', type: 'date', required: true, hint: 'Date the client needs our proposal' },
      { name: 'projectStartDate', label: 'Expected project start', type: 'date' },
      { name: 'estimatedValue', label: 'Estimated value (SAR)', type: 'number', placeholder: 'Budget indication if known' },
      { name: 'competition', label: 'Competition / other bidders', type: 'text' },
    ],
  },
  {
    id: 'opportunity',
    title: 'Opportunity overview',
    icon: 'chart',
    fields: [
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['High - urgent', 'Medium', 'Low'], default: 'Medium' },
      { name: 'winProbability', label: 'Chance of winning', type: 'select', options: ['Hot (>70%)', 'Warm (30-70%)', 'Cold (<30%)'] },
      { name: 'summary', label: 'High level information about the opportunity', type: 'textarea', required: true, rows: 5, placeholder: 'What did the client ask for, site conditions, decision maker, next steps...' },
      { name: 'clientRequirements', label: 'Specific client requests / conditions', type: 'textarea', rows: 3 },
    ],
  },
];

/** Step 2 & 3 - the product lines and their technical questions. */
const PRODUCTS = [
  {
    id: 'stp',
    name: 'Sewage Treatment Plant (STP)',
    short: 'STP',
    icon: 'stp',
    description: 'Packaged & civil STP - MBBR, MBR, SBR, extended aeration',
    fields: [
      { name: 'designFlow', label: 'Design flow (m³/day)', type: 'number', required: true },
      { name: 'populationEquivalent', label: 'Population equivalent (persons)', type: 'number' },
      { name: 'influentSource', label: 'Type of sewage', type: 'select', required: true, options: ['Domestic / residential', 'Labour accommodation', 'Commercial / offices', 'Hotel / resort', 'Industrial', 'Mixed'] },
      { name: 'technology', label: 'Preferred technology', type: 'select', options: ['MBBR', 'MBR', 'SBR', 'Extended aeration', 'Packaged plant', 'Client open to our proposal'] },
      { name: 'installationType', label: 'Installation type', type: 'select', options: ['Underground concrete (civil)', 'Above ground GRP', 'Above ground steel', 'Containerised', 'Modular / skid'] },
      { name: 'effluentQuality', label: 'Required treated water quality', type: 'text', placeholder: 'e.g. BOD < 10, TSS < 10, FC nil' },
      { name: 'treatedWaterUse', label: 'Treated water will be used for', type: 'multiselect', options: ['Landscape irrigation', 'Toilet flushing', 'Cooling towers', 'Discharge to municipal sewer', 'Tankered off site', 'Not decided'] },
      { name: 'sludgeHandling', label: 'Sludge handling', type: 'select', options: ['Sludge holding tank only', 'Filter press', 'Belt press / decanter', 'Drying beds', 'Tanker removal', 'Not decided'] },
      { name: 'authority', label: 'Approving authority', type: 'select', options: ['Ministry of Environment, Water & Agriculture (MEWA)', 'National Water Company (NWC)', 'Saudi Water Authority', 'Municipality / Amanah (MOMRAH)', 'Royal Commission (Jubail & Yanbu)', 'Giga-project authority (NEOM, Qiddiya, Diriyah, Red Sea)', 'Saudi Aramco', 'MODON - industrial cities', 'Other', 'Not known'] },
      { name: 'scopeOfWork', label: 'Existing or new plant', type: 'select', options: ['New plant', 'Upgrade of existing', 'Retrofit / rehabilitation', 'Replacement'] },
      { name: 'odourControl', label: 'Odour control required', type: 'checkbox' },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'greywater',
    name: 'Greywater Treatment & Recycling',
    short: 'Greywater',
    icon: 'greywater',
    description: 'Greywater recycling for irrigation, flushing & cooling make-up',
    fields: [
      { name: 'designFlow', label: 'Design flow (m³/day)', type: 'number', required: true },
      { name: 'greywaterSources', label: 'Greywater sources', type: 'multiselect', required: true, options: ['Showers / bath', 'Wash basins', 'Laundry', 'Kitchen', 'AC condensate', 'Swimming pool backwash'] },
      { name: 'reuseApplication', label: 'Reuse application', type: 'multiselect', required: true, options: ['Landscape irrigation', 'Toilet flushing', 'Water features', 'Cooling tower make-up', 'Car / floor washing'] },
      { name: 'technology', label: 'Preferred technology', type: 'select', options: ['MBR', 'Ultrafiltration', 'MBBR + UF', 'Sand filter + UV', 'Client open to our proposal'] },
      { name: 'buildingType', label: 'Building type', type: 'select', options: ['Villa', 'Villa compound', 'Apartment building', 'Hotel', 'Labour accommodation', 'Mall / commercial', 'School / institution', 'Other'] },
      { name: 'storageCapacity', label: 'Treated water storage required (m³)', type: 'number' },
      { name: 'disinfection', label: 'Disinfection', type: 'select', options: ['UV', 'Chlorination', 'UV + chlorination', 'Not decided'] },
      { name: 'plantRoom', label: 'Plant room / space available', type: 'select', options: ['Yes - dedicated room', 'Yes - shared space', 'Underground tank only', 'To be confirmed'] },
      { name: 'greenBuilding', label: 'Green building requirement', type: 'select', options: ['LEED', 'Mostadam', 'None', 'Not known'] },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'ro',
    name: 'Reverse Osmosis / Desalination',
    short: 'RO',
    icon: 'ro',
    description: 'SWRO, BWRO, process water & polishing plants',
    fields: [
      { name: 'productFlow', label: 'Required product water (m³/day)', type: 'number', required: true },
      { name: 'feedSource', label: 'Feed water source', type: 'select', required: true, options: ['Seawater', 'Brackish well water', 'Municipal / potable', 'TSE / treated effluent', 'Process water', 'Not known'] },
      { name: 'feedTds', label: 'Feed water TDS (ppm)', type: 'number', hint: 'From the client water analysis if available' },
      { name: 'productTds', label: 'Required product TDS (ppm)', type: 'number' },
      { name: 'application', label: 'Application', type: 'select', required: true, options: ['Potable water', 'Boiler feed', 'Process water', 'Irrigation', 'Bottling / beverage', 'Cooling tower make-up', 'Laboratory / medical'] },
      { name: 'preTreatment', label: 'Pre-treatment required', type: 'select', options: ['Yes - to be designed by us', 'Existing at site', 'Not required', 'To be confirmed'] },
      { name: 'recovery', label: 'Target recovery (%)', type: 'number' },
      { name: 'brineDisposal', label: 'Brine / reject disposal', type: 'select', options: ['Sea outfall', 'Soakaway', 'Municipal sewer', 'Evaporation pond', 'Tanker removal', 'Not decided'] },
      { name: 'plantType', label: 'Plant arrangement', type: 'select', options: ['Skid mounted', 'Containerised', 'Plant room installation', 'Mobile / trailer'] },
      { name: 'powerSupply', label: 'Power available at site', type: 'select', options: ['415V / 3 phase', '230V / single phase', 'Generator', 'Solar / hybrid', 'Not available yet'] },
      { name: 'waterAnalysis', label: 'Water analysis provided by client', type: 'checkbox', hint: 'Attach it in the next step' },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'stormwater',
    name: 'Stormwater Management',
    short: 'Stormwater',
    icon: 'stormwater',
    description: 'Attenuation, soakaways, pump stations & drainage networks',
    fields: [
      { name: 'catchmentArea', label: 'Catchment area (m²)', type: 'number', required: true },
      { name: 'systemType', label: 'System required', type: 'multiselect', required: true, options: ['Attenuation tank', 'Infiltration / soakaway', 'Stormwater pump station', 'Channel drainage', 'Gully & pipe network', 'Rainwater harvesting', 'Oil / water separator'] },
      { name: 'peakFlow', label: 'Peak flow (l/s)', type: 'number' },
      { name: 'rainfallIntensity', label: 'Design rainfall intensity', type: 'text', placeholder: 'e.g. 80 mm/hr - 25 year return' },
      { name: 'dischargePoint', label: 'Discharge point', type: 'select', options: ['Municipal storm network', 'Sea / creek outfall', 'Soakaway / ground', 'Reuse / irrigation tank', 'Not decided'] },
      { name: 'groundConditions', label: 'Ground conditions', type: 'select', options: ['Sandy - good infiltration', 'Rocky', 'High water table', 'Coastal / saline', 'Not known'] },
      { name: 'waterTableDepth', label: 'Water table depth (m)', type: 'number' },
      { name: 'storageVolume', label: 'Required storage volume (m³)', type: 'number' },
      { name: 'drawingsAvailable', label: 'Site / drainage drawings available', type: 'checkbox', hint: 'Attach them in the next step' },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'landscape',
    name: 'Landscape & Irrigation',
    short: 'Landscape',
    icon: 'landscape',
    description: 'Softscape, hardscape, irrigation networks & water features',
    fields: [
      { name: 'landscapeArea', label: 'Landscape area (m²)', type: 'number', required: true },
      { name: 'scope', label: 'Scope', type: 'multiselect', required: true, options: ['Softscape / planting', 'Hardscape', 'Irrigation network', 'Water features / fountains', 'Swimming pool', 'Green wall', 'Turf / lawn', 'Trees & palms', 'Maintenance contract'] },
      { name: 'irrigationType', label: 'Irrigation type', type: 'multiselect', options: ['Drip', 'Pop-up sprinkler', 'Bubbler', 'Subsurface', 'Manual / hose'] },
      { name: 'waterSource', label: 'Irrigation water source', type: 'select', options: ['TSE / treated sewage effluent', 'Treated greywater', 'Potable', 'Well water', 'Tanker supply', 'Not decided'] },
      { name: 'waterDemand', label: 'Estimated water demand (m³/day)', type: 'number' },
      { name: 'controlSystem', label: 'Irrigation control', type: 'select', options: ['Standard controller', 'Smart / central control', 'Weather based', 'Manual', 'Not decided'] },
      { name: 'pumpRoom', label: 'Irrigation pump room', type: 'select', options: ['Existing', 'New - in our scope', 'By others', 'To be confirmed'] },
      { name: 'siteVisitDone', label: 'Site survey completed', type: 'checkbox' },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'vacuum',
    name: 'Vacuum Sewer System',
    short: 'Vacuum sewer',
    icon: 'vacuum',
    description: 'Vacuum stations, collection chambers, valves & networks',
    fields: [
      { name: 'connections', label: 'Number of connections', type: 'number', required: true },
      { name: 'servedPopulation', label: 'Population served', type: 'number' },
      { name: 'peakFlow', label: 'Peak flow (m³/hr)', type: 'number' },
      { name: 'networkLength', label: 'Approximate network length (m)', type: 'number' },
      { name: 'terrain', label: 'Site / terrain conditions', type: 'select', options: ['Flat', 'Rolling / undulating', 'High water table', 'Rocky', 'Coastal', 'Dense built-up area'] },
      { name: 'applicationType', label: 'Application', type: 'select', options: ['Residential community', 'Labour accommodation', 'Resort / hotel', 'Industrial area', 'Island / coastal development', 'Marina', 'Camp site'] },
      { name: 'stationType', label: 'Vacuum station type', type: 'select', options: ['Prefabricated / packaged', 'Concrete built', 'Containerised', 'Not decided'] },
      { name: 'dischargePoint', label: 'Discharge to', type: 'text', placeholder: 'e.g. existing STP / municipal main' },
      { name: 'valvePits', label: 'Number of valve pits (if known)', type: 'number' },
      { name: 'notes', label: 'Other technical information from the client', type: 'textarea', rows: 4 },
    ],
  },
];

/** Step 4 - who registers it and who receives it. */
const SUBMISSION_SECTION = {
  id: 'submission',
  title: 'Sales representative',
  fields: [
    { name: 'salesName', label: 'Your name', type: 'text', required: true, remember: true },
    { name: 'salesEmail', label: 'Your e-mail', type: 'email', required: true, remember: true },
    { name: 'salesPhone', label: 'Your mobile', type: 'tel', remember: true },
    { name: 'visitDate', label: 'Date of client visit', type: 'date', required: true },
    { name: 'nextAction', label: 'Next action / follow up', type: 'textarea', rows: 3, placeholder: 'e.g. send budgetary offer by Thursday, technical meeting next week' },
  ],
};

const PRIORITY_LABELS = { 'High - urgent': 'HIGH', Medium: 'MEDIUM', Low: 'LOW' };

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

/** Every field the form can contain, keyed by the name used in the payload. */
function fieldIndex() {
  const index = new Map();
  for (const section of OPPORTUNITY_SECTIONS) {
    for (const field of section.fields) index.set(field.name, { ...field, section: section.id });
  }
  for (const field of SUBMISSION_SECTION.fields) index.set(field.name, { ...field, section: 'submission' });
  return index;
}

module.exports = {
  COMPANY,
  OPPORTUNITY_SECTIONS,
  PRODUCTS,
  SUBMISSION_SECTION,
  PRIORITY_LABELS,
  getProduct,
  fieldIndex,
};
