// Single source of truth for business facts. Every value marked `verify: true`
// renders a "[Need update from Oliver]" marker until it is confirmed.

export const site = {
  name: 'Alfa Triton Engineering',
  legalName: 'Alfa Triton Products Pty Ltd',
  url: 'https://www.alfatriton.com.au',
  founded: 1974,
  tagline: 'Precision engineering & 24/7 breakdown support for production lines',
  description:
    'Alfa Triton Engineering is a Western Sydney engineering workshop, est. 1974. CNC machining, gear cutting, stainless fabrication, welding, machine design and 24/7 on-site breakdown repairs for food, pharmaceutical, printing, packaging and rail production lines.',

  phone: { display: '02 9642 2899', tel: '+61296422899' },
  afterHours: { display: '0439 671 559', tel: '+61439671559', verify: true },
  email: { address: 'sales@alfatriton.com', verify: true },
  address: {
    street: '18 Wentworth St',
    locality: 'Clyde',
    region: 'NSW',
    postcode: '2142',
    country: 'AU',
    // Old site also mentions a Greenacre facility — confirm which is current.
    verify: true,
    geo: { lat: -33.8328, lng: 151.0215 },
    mapsUrl: 'https://maps.google.com/?q=18+Wentworth+St+Clyde+NSW+2142',
  },
  hours: { display: 'Mon–Fri business hours · 24/7 breakdown line', verify: true },
  abn: { value: 'ABN XX XXX XXX XXX', verify: true },
  serviceArea: ['Central Coast', 'Greater Sydney', 'Wollongong', 'Blue Mountains'],
  warrantyMonths: 12,
};

export const yearsInBusiness = new Date().getFullYear() - site.founded;

export type Service = {
  id: string;
  title: string;
  short: string;
  points: string[];
  icon: string;
  formValue: string;
};

export const services: Service[] = [
  {
    id: 'breakdown',
    title: '24/7 Breakdown & On-site Maintenance',
    short: 'Line down? Our crew comes to you — repair on site or measure up and make it in our workshop overnight.',
    points: ['On-site repair & advice', 'Scheduled maintenance', 'Shutdown & weekend crews', 'Install & commission machinery'],
    icon: 'bolt',
    formValue: 'Breakdown / urgent repair',
  },
  {
    id: 'cnc',
    title: 'CNC Turning & Milling',
    short: 'Precision parts from one-off prototypes to production runs, machined in-house.',
    points: ['Mazak Quickturn 15N (Mazatrol T32-2)', 'Milling (Romac)', 'Prototype to production quantities', 'Alloy, stainless, mild steel, brass, copper, aluminium, plastics'],
    icon: 'lathe',
    formValue: 'Machined parts',
  },
  {
    id: 'gears',
    title: 'Gear Cutting & Gearbox Overhaul',
    short: 'Obsolete or hard-to-source gears reverse-engineered and cut — up to 2 m diameter.',
    points: ['Spur, helical, bevel, worm', 'Internal & external splines', 'External up to 2 m · internal up to 1 m', 'NDT: ultrasonic & MPI'],
    icon: 'gear',
    formValue: 'Gear cutting / gearbox',
  },
  {
    id: 'fabrication',
    title: 'Stainless & Sheet Metal Fabrication',
    short: 'Food- and pharma-grade stainless work, from CAD to laser-cut, folded, rolled and finished.',
    points: ['Laser cut, folded & rolled', 'Hoppers, chutes, guards & frames', 'Hygienic stainless finishes', 'Start-to-finish in one shop'],
    icon: 'sheet',
    formValue: 'Stainless & sheet metal fabrication',
  },
  {
    id: 'welding',
    title: 'TIG & MIG Welding',
    short: 'Specialists in stainless — in the workshop or on site at your plant.',
    points: ['TIG: stainless 0.5–16 mm', 'MIG: mild steel up to 30 mm', 'Stainless, aluminium, mild steel, cast iron', 'On-site repair welding'],
    icon: 'weld',
    formValue: 'Welding',
  },
  {
    id: 'design',
    title: 'Machine Design, Rebuild & Reverse Engineering',
    short: 'New machines designed in SolidWorks, old ones rebuilt and improved — one-stop from concept to start-up.',
    points: ['SolidWorks CAD & load simulation', 'Engineering drawings supplied', 'Machine rebuilds & upgrades', 'Reverse-engineer sample parts'],
    icon: 'cad',
    formValue: 'Machine design / rebuild',
  },
];

export const industries = [
  { title: 'Food & Beverage', copy: 'Hygienic stainless equipment, conveyors, hoppers and fast breakdown repairs to keep production running.', icon: 'food' },
  { title: 'Pharmaceutical', copy: 'Precision parts and stainless fabrication machined to tight tolerances.', icon: 'pharma' },
  { title: 'Printing & Packaging', copy: 'Rollers, drive rolls, shafts and gears machined and rebuilt for converting and packaging lines.', icon: 'print' },
  { title: 'Rail & Transport', copy: 'Machined components, fabrication and welding for rail and transport maintenance.', icon: 'rail' },
  { title: 'Steel & Heavy Industry', copy: 'Gear cutting, gearbox overhauls and heavy fabrication for industrial plant.', icon: 'steel' },
  { title: 'Engineering Workshops', copy: 'Overflow machining, gear cutting and CAD support for fellow workshops.', icon: 'workshop' },
];

export const faqs = [
  {
    q: 'Do you offer 24/7 breakdown repairs?',
    a: 'Yes. Alfa Triton Engineering runs a 24/7 breakdown service from the Central Coast to Wollongong and west to the Blue Mountains. Call the after-hours line and our crew can repair on site, or measure up and machine the part in our Western Sydney workshop.',
  },
  {
    q: 'Can you make a part that is obsolete or no longer available?',
    a: 'Yes. We reverse-engineer worn or obsolete parts — including gears and splined shafts — by measuring the sample, modelling it in SolidWorks and machining a replacement in-house. Drawings can be supplied for your records.',
  },
  {
    q: 'What size gears can you cut?',
    a: 'We cut spur, helical, bevel, worm and spline gears up to 2 metres in diameter, and internal gearing up to 1 metre. Parts can be tested with ultrasonic or magnetic particle inspection (NDT).',
  },
  {
    q: 'Do you work with food-grade stainless steel?',
    a: 'Yes. Stainless fabrication and TIG welding for food, beverage and pharmaceutical plants is a core part of our work — hoppers, chutes, guards, frames, pipework and machine parts.',
  },
  {
    q: 'Where are you located and which areas do you service?',
    a: 'Our workshop is in Clyde, Western Sydney (NSW 2142). We service Greater Sydney, the Central Coast, Wollongong and the Blue Mountains, on site or in our workshop.',
  },
  {
    q: 'Is your work guaranteed?',
    a: 'Every Alfa Triton product carries a 12-month warranty, and work is built and tested to Australian Standards.',
  },
  {
    q: 'How do I get a quote?',
    a: 'Send us the details through the quote form — attach drawings, photos or a sketch if you have them — or call 02 9642 2899. For anything urgent, call the 24/7 line.',
  },
];
