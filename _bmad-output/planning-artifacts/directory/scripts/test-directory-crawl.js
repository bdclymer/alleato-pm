/**
 * Test script for Procore Directory Crawler
 * This demonstrates the crawler functionality with sample data
 */

const fs = require('fs');
const path = require('path');

// Sample data for testing
const sampleUsers = [
  {
    id: '12345',
    name: 'John Smith',
    email: 'john.smith@company.com',
    phone: '555-123-4567',
    company: 'ABC Construction',
    companyUrl: '/companies/abc-construction',
    permissionTemplate: 'Project Manager',
    isAdmin: true,
    profileUrl: '/directory/users/12345'
  },
  {
    id: '12346',
    name: 'Jane Doe',
    email: 'jane.doe@xyz-contractors.com',
    phone: '555-234-5678',
    company: 'XYZ Contractors',
    companyUrl: '/companies/xyz-contractors',
    permissionTemplate: 'Subcontractor',
    isAdmin: false,
    profileUrl: '/directory/users/12346'
  },
  {
    id: '12347',
    name: 'Mike Johnson',
    email: 'mike.j@abc.com',
    phone: '',
    company: 'ABC Construction',
    companyUrl: '/companies/abc-construction',
    permissionTemplate: 'Field Worker',
    isAdmin: false,
    profileUrl: '/directory/users/12347'
  },
  {
    id: '12348',
    name: 'Sarah Williams',
    email: 'sarah@designfirm.com',
    phone: '555-345-6789',
    company: 'Design Associates',
    companyUrl: '/companies/design-associates',
    permissionTemplate: 'Architect',
    isAdmin: true,
    profileUrl: '/directory/users/12348'
  }
];

const sampleVendors = [
  {
    id: 'vendor-001',
    name: 'ABC Construction',
    type: 'General Contractor',
    userCount: 15,
    primaryContact: 'John Smith'
  },
  {
    id: 'vendor-002',
    name: 'XYZ Contractors',
    type: 'Subcontractor',
    userCount: 8,
    primaryContact: 'Jane Doe'
  },
  {
    id: 'vendor-003',
    name: 'Design Associates',
    type: 'Architect',
    userCount: 3,
    primaryContact: 'Sarah Williams'
  },
  {
    id: 'vendor-004',
    name: 'Safety Consultants Inc',
    type: 'Consultant',
    userCount: 0,
    primaryContact: null
  }
];

const samplePages = [
  {
    url: '/directory/groups/users',
    pageName: 'Users by Company',
    category: 'Users',
    analysis: {
      components: {
        tables: 1,
        forms: 2,
        buttons: 25,
        inputs: 5
      },
      directorySpecific: {
        userRows: 50,
        vendorCards: 0,
        permissionBadges: 50,
        contactLinks: 75
      }
    }
  },
  {
    url: '/directory/vendors',
    pageName: 'Company Directory',
    category: 'Vendors',
    analysis: {
      components: {
        tables: 0,
        cards: 10,
        buttons: 15,
        inputs: 2
      },
      directorySpecific: {
        userRows: 0,
        vendorCards: 10,
        permissionBadges: 0,
        contactLinks: 20
      }
    }
  }
];

// Test data generation functions
function generateTestReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers: sampleUsers.length,
      totalVendors: sampleVendors.length,
      totalPages: samplePages.length,
      adminUsers: sampleUsers.filter(u => u.isAdmin).length,
      dataCompleteness: {
        usersWithEmail: sampleUsers.filter(u => u.email).length,
        usersWithPhone: sampleUsers.filter(u => u.phone).length,
        completeProfiles: sampleUsers.filter(u => u.email && u.phone).length
      }
    },
    usersByCompany: {},
    vendorAnalysis: {},
    permissionDistribution: {}
  };

  // Group users by company
  sampleUsers.forEach(user => {
    const company = user.company || 'Unknown';
    if (!report.usersByCompany[company]) {
      report.usersByCompany[company] = {
        users: [],
        adminCount: 0,
        regularCount: 0
      };
    }
    report.usersByCompany[company].users.push(user);
    if (user.isAdmin) {
      report.usersByCompany[company].adminCount++;
    } else {
      report.usersByCompany[company].regularCount++;
    }
  });

  // Analyze vendors
  sampleVendors.forEach(vendor => {
    report.vendorAnalysis[vendor.name] = {
      type: vendor.type,
      userCount: vendor.userCount,
      hasUsers: vendor.userCount > 0,
      primaryContact: vendor.primaryContact
    };
  });

  // Permission distribution
  sampleUsers.forEach(user => {
    const template = user.permissionTemplate || 'Unknown';
    if (!report.permissionDistribution[template]) {
      report.permissionDistribution[template] = {
        count: 0,
        users: [],
        isAdminTemplate: false
      };
    }
    report.permissionDistribution[template].count++;
    report.permissionDistribution[template].users.push(user.name);
    if (user.isAdmin) {
      report.permissionDistribution[template].isAdminTemplate = true;
    }
  });

  return report;
}

// Create test output structure
function createTestOutput() {
  const outputDir = 'procore-directory-crawl-test';
  const dirs = [
    outputDir,
    path.join(outputDir, 'pages'),
    path.join(outputDir, 'reports'),
    path.join(outputDir, 'user-profiles'),
    path.join(outputDir, 'directory-modals')
  ];

  // Create directories
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate test report
  const testReport = generateTestReport();

  // Save test data
  fs.writeFileSync(
    path.join(outputDir, 'reports', 'test-data.json'),
    JSON.stringify(testReport, null, 2)
  );

  // Generate markdown report
  const markdownReport = `# Test Directory Analysis Report

Generated: ${new Date().toISOString()}

## Summary
This is a test report demonstrating the directory crawler output format.

### Key Metrics
- Total Users: ${testReport.summary.totalUsers}
- Total Vendors: ${testReport.summary.totalVendors}
- Admin Users: ${testReport.summary.adminUsers}
- Data Completeness: ${Math.round(testReport.summary.dataCompleteness.completeProfiles / testReport.summary.totalUsers * 100)}%

### User Distribution by Company
${Object.entries(testReport.usersByCompany)
  .map(([company, data]) => `- **${company}**: ${data.users.length} users (${data.adminCount} admins)`)
  .join('\n')}

### Vendor Overview
${Object.entries(testReport.vendorAnalysis)
  .map(([vendor, data]) => `- **${vendor}** (${data.type}): ${data.userCount} users`)
  .join('\n')}

### Permission Templates
${Object.entries(testReport.permissionDistribution)
  .map(([template, data]) => `- **${template}**: ${data.count} users${data.isAdminTemplate ? ' (Admin)' : ''}`)
  .join('\n')}

## Sample Users
${sampleUsers.slice(0, 3).map(user => 
  `### ${user.name}
- Company: ${user.company}
- Email: ${user.email || 'Not provided'}
- Phone: ${user.phone || 'Not provided'}
- Permission: ${user.permissionTemplate}
- Admin: ${user.isAdmin ? 'Yes' : 'No'}`
).join('\n\n')}
`;

  fs.writeFileSync(
    path.join(outputDir, 'reports', 'test-overview.md'),
    markdownReport
  );

  // Create sample page metadata
  samplePages.forEach(page => {
    const pageDir = path.join(outputDir, 'pages', page.pageName.toLowerCase().replace(/\s+/g, '-'));
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }

    const metadata = {
      ...page,
      timestamp: new Date().toISOString(),
      testData: true
    };

    fs.writeFileSync(
      path.join(pageDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  });

  // Create test README
  const readme = `# Directory Crawler Test Output

This is a test output demonstrating the structure and format of the directory crawler results.

## Contents
- Sample user data (${sampleUsers.length} users)
- Sample vendor data (${sampleVendors.length} vendors)
- Test reports showing analysis format
- Example directory structure

## Test Data Overview
- Users across ${Object.keys(testReport.usersByCompany).length} companies
- ${testReport.summary.adminUsers} admin users
- ${testReport.summary.dataCompleteness.completeProfiles} users with complete profiles

This test demonstrates the expected output format without requiring actual Procore access.
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);

  console.log(`\n✅ Test output created in: ${outputDir}`);
  console.log(`📊 Generated ${Object.keys(testReport).length} report sections`);
  console.log(`👥 Processed ${sampleUsers.length} test users`);
  console.log(`🏢 Analyzed ${sampleVendors.length} test vendors`);
}

// Run test
console.log('🧪 Running Directory Crawler Test...');
createTestOutput();
console.log('\n📁 Check the procore-directory-crawl-test directory for results');