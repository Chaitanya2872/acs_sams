const COMMON_FIELDS = [
  {
    field_name: 'test_date',
    field_type: 'date',
    field_label: 'Test Date',
    required: true
  },
  {
    field_name: 'component_label',
    field_type: 'text',
    field_label: 'Component / Location',
    required: true
  },
  {
    field_name: 'tested_by',
    field_type: 'text',
    field_label: 'Tested By',
    required: true
  },
  {
    field_name: 'remarks',
    field_type: 'text',
    field_label: 'Remarks',
    required: false
  }
];

const buildFormat = ({
  format_id,
  test_name,
  display_name,
  is_custom = false,
  summary,
  specificFields
}) => ({
  format_id,
  test_name,
  display_name,
  is_custom,
  format_template: {
    version: 1,
    summary,
    sections: [
      {
        key: 'general',
        title: 'General Details',
        fields: COMMON_FIELDS.map((field) => field.field_name)
      },
      {
        key: 'results',
        title: 'Result Parameters',
        fields: specificFields.map((field) => field.field_name)
      }
    ]
  },
  field_definitions: [...COMMON_FIELDS, ...specificFields]
});

const DEFAULT_TEST_FORMATS = [
  buildFormat({
    format_id: 'TF_CUSTOM',
    test_name: 'custom',
    display_name: 'Custom Format',
    is_custom: true,
    summary: 'Flexible format for assignment-specific or project-specific testing needs.',
    specificFields: [
      { field_name: 'custom_test_name', field_type: 'text', field_label: 'Custom Test Name', required: true },
      { field_name: 'observation_summary', field_type: 'text', field_label: 'Observation Summary', required: true },
      { field_name: 'result_status', field_type: 'select', field_label: 'Result Status', required: false, options: ['Pass', 'Fail', 'Needs Review'] }
    ]
  }),
  buildFormat({
    format_id: 'TF_REBOUND_HAMMER',
    test_name: 'rebound_hammer',
    display_name: 'Rebound Hammer Test',
    summary: 'Surface hardness and indicative compressive strength assessment.',
    specificFields: [
      { field_name: 'element_count', field_type: 'number', field_label: 'Number of Test Points', required: true },
      { field_name: 'avg_rebound_number', field_type: 'number', field_label: 'Average Rebound Number', required: true },
      { field_name: 'estimated_strength_mpa', field_type: 'number', field_label: 'Estimated Strength (MPa)', required: true }
    ]
  }),
  buildFormat({
    format_id: 'TF_ULTRA_PULSE_VELOCITY',
    test_name: 'ultra_pulse_velocity',
    display_name: 'Ultra Pulse Velocity Test',
    summary: 'Concrete quality assessment using pulse velocity readings.',
    specificFields: [
      { field_name: 'path_length_mm', field_type: 'number', field_label: 'Path Length (mm)', required: true },
      { field_name: 'transit_time_us', field_type: 'number', field_label: 'Transit Time (microseconds)', required: true },
      { field_name: 'velocity_km_s', field_type: 'number', field_label: 'Pulse Velocity (km/s)', required: true }
    ]
  }),
  buildFormat({
    format_id: 'TF_HALF_CELL_POTENTIAL',
    test_name: 'half_cell_potential',
    display_name: 'Half Cell Potential Test',
    summary: 'Corrosion probability assessment for reinforcement.',
    specificFields: [
      { field_name: 'grid_reference', field_type: 'text', field_label: 'Grid / Test Location', required: true },
      { field_name: 'avg_potential_mv', field_type: 'number', field_label: 'Average Potential (mV)', required: true },
      { field_name: 'corrosion_probability', field_type: 'select', field_label: 'Corrosion Probability', required: true, options: ['Low', 'Moderate', 'High'] }
    ]
  }),
  buildFormat({
    format_id: 'TF_CARBONATION_DEPTH',
    test_name: 'carbonation_depth',
    display_name: 'Carbonation Depth Test',
    summary: 'Measurement of carbonation penetration depth in concrete.',
    specificFields: [
      { field_name: 'sample_count', field_type: 'number', field_label: 'Number of Samples', required: true },
      { field_name: 'avg_depth_mm', field_type: 'number', field_label: 'Average Carbonation Depth (mm)', required: true },
      { field_name: 'cover_status', field_type: 'select', field_label: 'Depth vs Cover', required: true, options: ['Within cover', 'Beyond cover'] }
    ]
  }),
  buildFormat({
    format_id: 'TF_COVER_METER',
    test_name: 'cover_meter',
    display_name: 'Cover Meter Test',
    summary: 'Measurement of reinforcement cover and bar detection.',
    specificFields: [
      { field_name: 'bar_diameter_mm', field_type: 'number', field_label: 'Detected Bar Diameter (mm)', required: false },
      { field_name: 'avg_cover_mm', field_type: 'number', field_label: 'Average Cover (mm)', required: true },
      { field_name: 'cover_compliance', field_type: 'select', field_label: 'Cover Compliance', required: true, options: ['Adequate', 'Marginal', 'Inadequate'] }
    ]
  }),
  buildFormat({
    format_id: 'TF_CORE_CUTTING',
    test_name: 'core_cutting',
    display_name: 'Core Cutting Test',
    summary: 'Core sample extraction and compressive strength validation.',
    specificFields: [
      { field_name: 'core_diameter_mm', field_type: 'number', field_label: 'Core Diameter (mm)', required: true },
      { field_name: 'core_length_mm', field_type: 'number', field_label: 'Core Length (mm)', required: true },
      { field_name: 'compressive_strength_mpa', field_type: 'number', field_label: 'Compressive Strength (MPa)', required: true }
    ]
  }),
  buildFormat({
    format_id: 'TF_PULL_OUT',
    test_name: 'pull_out',
    display_name: 'Pull Out Test',
    summary: 'In-situ concrete strength estimation from pull-out force.',
    specificFields: [
      { field_name: 'anchor_type', field_type: 'text', field_label: 'Anchor Type', required: false },
      { field_name: 'peak_load_kn', field_type: 'number', field_label: 'Peak Load (kN)', required: true },
      { field_name: 'estimated_strength_mpa', field_type: 'number', field_label: 'Estimated Strength (MPa)', required: true }
    ]
  }),
  buildFormat({
    format_id: 'TF_CHEMICAL_ANALYSIS',
    test_name: 'chemical_analysis',
    display_name: 'Chemical Analysis Test',
    summary: 'Lab-based chemical assessment of concrete or steel samples.',
    specificFields: [
      { field_name: 'sample_reference', field_type: 'text', field_label: 'Sample Reference', required: true },
      { field_name: 'chloride_content', field_type: 'number', field_label: 'Chloride Content', required: false },
      { field_name: 'ph_value', field_type: 'number', field_label: 'pH Value', required: false }
    ]
  }),
  buildFormat({
    format_id: 'TF_ULTRASONIC_THICKNESS_GAUGE',
    test_name: 'ultrasonic_thickness_gauge',
    display_name: 'Ultrasonic Thickness Gauge Test',
    summary: 'Thickness measurement for steel and plate components.',
    specificFields: [
      { field_name: 'nominal_thickness_mm', field_type: 'number', field_label: 'Nominal Thickness (mm)', required: true },
      { field_name: 'measured_thickness_mm', field_type: 'number', field_label: 'Measured Thickness (mm)', required: true },
      { field_name: 'section_loss_percent', field_type: 'number', field_label: 'Section Loss (%)', required: false }
    ]
  }),
  buildFormat({
    format_id: 'TF_MAGNETIC_PARTICLE',
    test_name: 'magnetic_particle',
    display_name: 'Magnetic Particle Test',
    summary: 'Surface and near-surface crack detection in ferromagnetic material.',
    specificFields: [
      { field_name: 'surface_condition', field_type: 'select', field_label: 'Surface Condition', required: true, options: ['Prepared', 'As-is'] },
      { field_name: 'indication_count', field_type: 'number', field_label: 'Number of Indications', required: true },
      { field_name: 'result_status', field_type: 'select', field_label: 'Test Result', required: true, options: ['Acceptable', 'Repair Required', 'Reject'] }
    ]
  }),
  buildFormat({
    format_id: 'TF_LIQUID_PENETRATION',
    test_name: 'liquid_penetration',
    display_name: 'Liquid Penetration Test',
    summary: 'Surface flaw detection using penetrant inspection.',
    specificFields: [
      { field_name: 'penetrant_type', field_type: 'text', field_label: 'Penetrant Type', required: false },
      { field_name: 'dwell_time_min', field_type: 'number', field_label: 'Dwell Time (min)', required: true },
      { field_name: 'indication_summary', field_type: 'text', field_label: 'Indication Summary', required: true }
    ]
  }),
  buildFormat({
    format_id: 'TF_HARDNESS_TEST',
    test_name: 'hardness_test',
    display_name: 'Hardness Test',
    summary: 'Material hardness check for metallic elements.',
    specificFields: [
      { field_name: 'hardness_scale', field_type: 'select', field_label: 'Hardness Scale', required: true, options: ['BHN', 'HRB', 'HRC', 'HV'] },
      { field_name: 'avg_hardness_value', field_type: 'number', field_label: 'Average Hardness Value', required: true },
      { field_name: 'material_grade', field_type: 'text', field_label: 'Material Grade', required: false }
    ]
  })
];

module.exports = {
  DEFAULT_TEST_FORMATS
};
