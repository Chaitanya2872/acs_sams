const STATE_CODES = {
    'AN': 'Andaman & Nicobar Islands',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CH': 'Chandigarh',
    'CG': 'Chhattisgarh',
    'DD': 'Daman and Diu',
    'DL': 'New Delhi',
    'DN': 'Dadra and Nagar Haveli',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HP': 'Himachal Pradesh',
    'HR': 'Haryana',
    'JH': 'Jharkhand',
    'JK': 'Jammu & Kashmir',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LD': 'Lakshadweep',
    'MH': 'Maharashtra',
    'ML': 'Meghalaya',
    'MN': 'Manipur',
    'MP': 'Madhya Pradesh',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'PB': 'Punjab',
    'PY': 'Puducherry',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TS': 'Telangana',
    'TR': 'Tripura',
    'UK': 'Uttarakhand',
    'UP': 'Uttar Pradesh',
    'WB': 'West Bengal'
};

const STRUCTURAL_FORM_CODES = {
    '01': 'RCC Framed Structures',
    '02': 'Load Bearing Structures',
    '03': 'Steel Column Truss',
    '04': 'RCC Column Truss',
    '05': 'Steel Framed Structure',
    '06': 'Others'
};

const MATERIAL_CODES = {
    '1': 'Concrete',
    '2': 'Steel',
    '3': 'Masonry',
    '4': 'Other'
};

const STRUCTURE_TYPE_CODES = {
    '1': 'Residential Buildings',
    '2': 'Commercial Buildings',
    '3': 'Educational Buildings',
    '4': 'Hospital Buildings',
    '5': 'Industrial Structures'
};

const AGE_CODES = {
    '1': '50-60 years',
    '2': '40-49 years',
    '3': '30-39 years',
    '4': '15-29 years',
    '5': '1-14 years'
};

const RATING_DESCRIPTIONS = {
    5: 'Good Condition',
    4: 'Fair Condition',
    3: 'Poor Condition',
    2: 'Very Poor Condition',
    1: 'Failure Condition'
};

module.exports = {
    STATE_CODES,
    STRUCTURAL_FORM_CODES,
    MATERIAL_CODES,
    STRUCTURE_TYPE_CODES,
    AGE_CODES,
    RATING_DESCRIPTIONS
};