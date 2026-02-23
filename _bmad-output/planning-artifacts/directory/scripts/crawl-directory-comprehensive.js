const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = 'procore-directory-crawl';
const PAGES_DIR = path.join(OUTPUT_DIR, 'pages');
const REPORTS_DIR = path.join(OUTPUT_DIR, 'reports');
const MODALS_DIR = path.join(OUTPUT_DIR, 'directory-modals');
const USER_PROFILES_DIR = path.join(OUTPUT_DIR, 'user-profiles');
const VENDOR_DETAILS_DIR = path.join(OUTPUT_DIR, 'vendor-details');

// Credentials (should be moved to environment variables)
const USERNAME = 'your_username';
const PASSWORD = 'your_password';
const COMPANY_ID = '562949';
const PROJECT_ID = '954728542';

// Create directories if they don't exist
[OUTPUT_DIR, PAGES_DIR, REPORTS_DIR, MODALS_DIR, USER_PROFILES_DIR, VENDOR_DETAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Global data storage
const crawlData = {
  pages: [],
  users: [],
  vendors: [],
  groups: [],
  permissions: [],
  totalStats: {
    totalUsers: 0,
    totalVendors: 0,
    totalGroups: 0,
    adminUsers: 0,
    activeUsers: 0
  }
};

// Helper function to sanitize filenames
function sanitizeFilename(url) {
  return url.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
}

// Helper function to extract page category
function getPageCategory(url) {
  if (url.includes('/directory/groups')) return 'Groups';
  if (url.includes('/directory/users')) return 'Users';
  if (url.includes('/directory/vendors')) return 'Vendors';
  if (url.includes('/profile/')) return 'User Profile';
  if (url.includes('/company/')) return 'Company Details';
  return 'Directory';
}

// Main directory page capture function
async function captureDirectoryPage(page, url, pageName) {
  console.log(`\nCapturing directory page: ${pageName}`);
  
  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow dynamic content to load
    
    // Create directory for this page
    const pageDir = path.join(PAGES_DIR, sanitizeFilename(pageName));
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }
    
    // Take screenshot
    const screenshotPath = path.join(pageDir, 'screenshot.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      animations: 'disabled'
    });
    
    // Save DOM
    const domPath = path.join(pageDir, 'dom.html');
    const pageContent = await page.content();
    fs.writeFileSync(domPath, pageContent);
    
    // Extract and analyze directory data
    const directoryData = await extractDirectoryData(page);
    
    // Analyze page structure
    const pageAnalysis = await analyzeDirectoryStructure(page);
    
    // Extract all links and interactive elements
    const { links, clickables, dropdowns } = await extractDirectoryElements(page);
    
    // Create metadata
    const metadata = {
      url: url,
      pageName: pageName,
      category: getPageCategory(url),
      pageId: sanitizeFilename(url),
      timestamp: new Date().toISOString(),
      analysis: pageAnalysis,
      directoryData: directoryData,
      links: links.length,
      linkDetails: links,
      clickables: clickables.length,
      clickableDetails: clickables,
      dropdowns: dropdowns.length,
      dropdownDetails: dropdowns,
      screenshot: `pages/${sanitizeFilename(pageName)}/screenshot.png`
    };
    
    // Save metadata
    const metadataPath = path.join(pageDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Add to crawl data
    crawlData.pages.push(metadata);
    
    // Merge extracted data into global storage
    if (directoryData.users) {
      crawlData.users.push(...directoryData.users);
    }
    if (directoryData.vendors) {
      crawlData.vendors.push(...directoryData.vendors);
    }
    if (directoryData.groups) {
      crawlData.groups.push(...directoryData.groups);
    }
    
    console.log(`✓ Captured ${pageName} - ${links.length} links, ${clickables.length} clickables`);
    
    // Return discovered URLs for crawling
    return [...links, ...clickables]
      .filter(item => item.href && item.href.includes('/directory/'))
      .map(item => item.href);
    
  } catch (error) {
    console.error(`Error capturing page ${pageName}:`, error);
    return [];
  }
}

// Extract directory-specific data
async function extractDirectoryData(page) {
  const data = {
    users: [],
    vendors: [],
    groups: [],
    stats: {}
  };
  
  try {
    // Check if this is a users listing page
    const userRows = await page.$$('tr[data-user-id]');
    if (userRows.length > 0) {
      console.log(`Found ${userRows.length} user rows`);
      
      for (const row of userRows) {
        const userData = await row.evaluate(el => {
          const nameEl = el.querySelector('a[href*="/directory/users/"]');
          const emailEl = el.querySelector('a[href^="mailto:"]');
          const phoneEl = el.querySelector('a[href^="tel:"]');
          const companyEl = el.querySelector('td:nth-child(3) a');
          const permissionEl = el.querySelector('td:nth-child(4)');
          
          return {
            id: el.getAttribute('data-user-id'),
            name: nameEl ? nameEl.textContent.trim() : '',
            profileUrl: nameEl ? nameEl.href : '',
            email: emailEl ? emailEl.textContent.trim() : '',
            phone: phoneEl ? phoneEl.textContent.trim() : '',
            company: companyEl ? companyEl.textContent.trim() : '',
            companyUrl: companyEl ? companyEl.href : '',
            permissionTemplate: permissionEl ? permissionEl.textContent.trim() : '',
            isAdmin: permissionEl && permissionEl.textContent.includes('Admin')
          };
        });
        
        if (userData.id) {
          data.users.push(userData);
        }
      }
    }
    
    // Check if this is a vendors/companies page
    const vendorCards = await page.$$('.vendor-card, [data-vendor-id]');
    if (vendorCards.length > 0) {
      console.log(`Found ${vendorCards.length} vendor cards`);
      
      for (const card of vendorCards) {
        const vendorData = await card.evaluate(el => {
          const nameEl = el.querySelector('.vendor-name, h3');
          const typeEl = el.querySelector('.vendor-type, .company-type');
          const userCountEl = el.querySelector('.user-count');
          
          return {
            id: el.getAttribute('data-vendor-id') || '',
            name: nameEl ? nameEl.textContent.trim() : '',
            type: typeEl ? typeEl.textContent.trim() : '',
            userCount: userCountEl ? parseInt(userCountEl.textContent.match(/\d+/)?.[0] || '0') : 0,
            element: el.outerHTML.substring(0, 200) // For debugging
          };
        });
        
        if (vendorData.name) {
          data.vendors.push(vendorData);
        }
      }
    }
    
    // Extract summary statistics if available
    const statElements = await page.$$('.stat-card, .summary-stat');
    for (const stat of statElements) {
      const statData = await stat.evaluate(el => {
        const label = el.querySelector('.stat-label')?.textContent.trim();
        const value = el.querySelector('.stat-value')?.textContent.trim();
        return { label, value };
      });
      
      if (statData.label && statData.value) {
        data.stats[statData.label] = statData.value;
      }
    }
    
  } catch (error) {
    console.error('Error extracting directory data:', error);
  }
  
  return data;
}

// Analyze directory page structure
async function analyzeDirectoryStructure(page) {
  const analysis = {
    title: await page.title(),
    h1: await page.$eval('h1', el => el.textContent.trim()).catch(() => ''),
    components: {
      tables: 0,
      forms: 0,
      buttons: 0,
      inputs: 0,
      selects: 0,
      modals: 0,
      cards: 0
    },
    directorySpecific: {
      userRows: 0,
      vendorCards: 0,
      permissionBadges: 0,
      contactLinks: 0,
      filterOptions: 0,
      bulkActions: 0
    },
    tables: []
  };
  
  try {
    // Count general components
    analysis.components.tables = await page.$$eval('table', els => els.length);
    analysis.components.forms = await page.$$eval('form', els => els.length);
    analysis.components.buttons = await page.$$eval('button', els => els.length);
    analysis.components.inputs = await page.$$eval('input', els => els.length);
    analysis.components.selects = await page.$$eval('select', els => els.length);
    analysis.components.modals = await page.$$eval('[role="dialog"], .modal', els => els.length);
    analysis.components.cards = await page.$$eval('.card, [class*="card"]', els => els.length);
    
    // Count directory-specific elements
    analysis.directorySpecific.userRows = await page.$$eval('tr[data-user-id]', els => els.length);
    analysis.directorySpecific.vendorCards = await page.$$eval('.vendor-card, [data-vendor-id]', els => els.length);
    analysis.directorySpecific.permissionBadges = await page.$$eval('.permission-badge, [class*="permission"]', els => els.length);
    analysis.directorySpecific.contactLinks = await page.$$eval('a[href^="mailto:"], a[href^="tel:"]', els => els.length);
    analysis.directorySpecific.filterOptions = await page.$$eval('.filter-option, [data-filter]', els => els.length);
    analysis.directorySpecific.bulkActions = await page.$$eval('[data-bulk-action]', els => els.length);
    
    // Analyze tables structure
    const tables = await page.$$('table');
    for (const table of tables) {
      const tableInfo = await table.evaluate(el => {
        const headers = Array.from(el.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = el.querySelectorAll('tbody tr').length;
        return { headers, rows };
      });
      analysis.tables.push(tableInfo);
    }
    
  } catch (error) {
    console.error('Error analyzing page structure:', error);
  }
  
  return analysis;
}

// Extract directory-specific elements
async function extractDirectoryElements(page) {
  const links = [];
  const clickables = [];
  const dropdowns = [];
  
  try {
    // Extract all links
    const allLinks = await page.$$eval('a[href]', elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        href: el.href,
        title: el.title,
        ariaLabel: el.getAttribute('aria-label'),
        isUserProfile: el.href.includes('/directory/users/'),
        isVendor: el.href.includes('/directory/vendors/'),
        isEmail: el.href.startsWith('mailto:'),
        isPhone: el.href.startsWith('tel:')
      })).filter(link => 
        !link.href.includes('javascript:') && 
        !link.href.includes('#') &&
        link.href.includes('procore.com')
      )
    );
    links.push(...allLinks);
    
    // Extract clickable elements specific to directory
    const clickableElements = await page.$$eval('[role="button"], button, [onclick], .clickable, [data-action]', elements =>
      elements.map(el => ({
        text: el.textContent.trim(),
        type: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        dataAction: el.getAttribute('data-action'),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.title,
        isBulkAction: el.classList.contains('bulk-action') || el.hasAttribute('data-bulk-action'),
        isFilterButton: el.classList.contains('filter') || el.hasAttribute('data-filter')
      }))
    );
    clickables.push(...clickableElements);
    
    // Extract dropdowns and filters
    const dropdownElements = await page.$$eval('[aria-haspopup="true"], [data-toggle="dropdown"], select, .dropdown', elements =>
      elements.map(el => ({
        text: el.textContent.trim(),
        type: el.tagName.toLowerCase(),
        id: el.id,
        ariaLabel: el.getAttribute('aria-label'),
        options: el.tagName === 'SELECT' ? 
          Array.from(el.options || []).map(opt => opt.textContent.trim()) : []
      }))
    );
    dropdowns.push(...dropdownElements);
    
  } catch (error) {
    console.error('Error extracting elements:', error);
  }
  
  return { links, clickables, dropdowns };
}

// Capture user profile modal
async function captureUserProfile(page, userUrl, userName) {
  console.log(`Capturing user profile: ${userName}`);
  
  try {
    // Navigate to user profile or click to open modal
    if (userUrl.startsWith('http')) {
      await page.goto(userUrl, { waitUntil: 'networkidle' });
    } else {
      // Find and click the user link
      const userLink = await page.$(`a[href="${userUrl}"]`);
      if (userLink) {
        await userLink.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Wait for profile content
    await page.waitForSelector('.user-profile, .modal-content, [role="dialog"]', { timeout: 5000 });
    
    // Take screenshot
    const screenshotPath = path.join(USER_PROFILES_DIR, `${sanitizeFilename(userName)}.png`);
    
    // Try to capture just the modal/profile area
    const modalElement = await page.$('.modal-content, .user-profile-modal, [role="dialog"]');
    if (modalElement) {
      await modalElement.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    
    // Extract user details
    const userDetails = await page.evaluate(() => {
      const details = {};
      
      // Try various selectors for user information
      const selectors = {
        name: '.user-name, .profile-name, h1, h2',
        email: 'a[href^="mailto:"], .user-email',
        phone: 'a[href^="tel:"], .user-phone',
        company: '.user-company, .company-name',
        role: '.user-role, .permission-template',
        lastLogin: '.last-login, .last-activity'
      };
      
      for (const [key, selector] of Object.entries(selectors)) {
        const el = document.querySelector(selector);
        if (el) {
          details[key] = el.textContent.trim();
        }
      }
      
      // Extract all visible text for context
      details.allText = document.body.innerText.substring(0, 1000);
      
      return details;
    });
    
    // Save user profile data
    const profileData = {
      userName,
      url: userUrl,
      timestamp: new Date().toISOString(),
      details: userDetails,
      screenshot: `user-profiles/${sanitizeFilename(userName)}.png`
    };
    
    fs.writeFileSync(
      path.join(USER_PROFILES_DIR, `${sanitizeFilename(userName)}.json`),
      JSON.stringify(profileData, null, 2)
    );
    
    // Close modal if open
    const closeButton = await page.$('button[aria-label="Close"], .close, [data-dismiss]');
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(500);
    } else {
      // Try escape key
      await page.keyboard.press('Escape');
    }
    
    console.log(`✓ Captured profile for ${userName}`);
    
  } catch (error) {
    console.error(`Error capturing user profile ${userName}:`, error);
  }
}

// Capture filters and bulk actions
async function captureDirectoryFilters(page) {
  console.log('Capturing directory filters and bulk actions');
  
  try {
    // Capture group by dropdown if exists
    const groupByDropdown = await page.$('[data-testid="group-by"], select[name*="group"]');
    if (groupByDropdown) {
      await groupByDropdown.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(MODALS_DIR, 'group-by-dropdown.png'),
        fullPage: false 
      });
      await page.keyboard.press('Escape');
    }
    
    // Capture sort dropdown
    const sortDropdown = await page.$('[data-testid="sort"], select[name*="sort"]');
    if (sortDropdown) {
      await sortDropdown.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(MODALS_DIR, 'sort-dropdown.png'),
        fullPage: false 
      });
      await page.keyboard.press('Escape');
    }
    
    // Capture filter panel if exists
    const filterButton = await page.$('button:has-text("Filter"), [aria-label*="Filter"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(MODALS_DIR, 'filter-panel.png'),
        fullPage: false 
      });
      
      // Close filter panel
      const closeFilter = await page.$('button:has-text("Close"), [aria-label="Close"]');
      if (closeFilter) {
        await closeFilter.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
    
    // Capture bulk actions menu
    const bulkActionsButton = await page.$('button:has-text("Bulk Actions"), [data-bulk-actions]');
    if (bulkActionsButton) {
      // First select some items
      const checkboxes = await page.$$('input[type="checkbox"]:not([disabled])');
      for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        await checkboxes[i].click();
      }
      
      await bulkActionsButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(MODALS_DIR, 'bulk-actions-menu.png'),
        fullPage: false 
      });
      await page.keyboard.press('Escape');
      
      // Deselect items
      for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        await checkboxes[i].click();
      }
    }
    
  } catch (error) {
    console.error('Error capturing filters:', error);
  }
}

// Generate comprehensive reports
async function generateDirectoryReports() {
  console.log('\nGenerating directory reports...');
  
  // 1. Generate Directory Overview (Markdown)
  const overviewReport = generateOverviewReport();
  fs.writeFileSync(path.join(REPORTS_DIR, 'directory-overview.md'), overviewReport);
  
  // 2. Generate User Distribution Report
  const userReport = generateUserReport();
  fs.writeFileSync(path.join(REPORTS_DIR, 'user-distribution.md'), userReport);
  
  // 3. Generate Vendor Analysis Report
  const vendorReport = generateVendorReport();
  fs.writeFileSync(path.join(REPORTS_DIR, 'vendor-analysis.md'), vendorReport);
  
  // 4. Generate Permission Report
  const permissionReport = generatePermissionReport();
  fs.writeFileSync(path.join(REPORTS_DIR, 'permission-report.md'), permissionReport);
  
  // 5. Save complete data as JSON
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'complete-directory-data.json'),
    JSON.stringify(crawlData, null, 2)
  );
  
  // 6. Generate sitemap
  const sitemap = generateSitemap();
  fs.writeFileSync(path.join(REPORTS_DIR, 'sitemap-table.md'), sitemap);
  
  console.log('✓ All reports generated');
}

// Generate overview report
function generateOverviewReport() {
  const uniqueUsers = [...new Set(crawlData.users.map(u => u.id))];
  const uniqueVendors = [...new Set(crawlData.vendors.map(v => v.id))];
  const adminUsers = crawlData.users.filter(u => u.isAdmin);
  
  return `# Project Directory Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

### Key Metrics
- **Total Pages Crawled**: ${crawlData.pages.length}
- **Total Unique Users**: ${uniqueUsers.length}
- **Total Companies/Vendors**: ${uniqueVendors.length}
- **Admin Users**: ${adminUsers.length}
- **User Profiles Captured**: ${fs.readdirSync(USER_PROFILES_DIR).filter(f => f.endsWith('.json')).length}

### Coverage Summary
| Category | Count | Notes |
|----------|-------|--------|
| Directory Pages | ${crawlData.pages.filter(p => p.category === 'Directory').length} | Main directory listings |
| User Pages | ${crawlData.pages.filter(p => p.category === 'Users').length} | Individual user listings |
| Group Pages | ${crawlData.pages.filter(p => p.category === 'Groups').length} | Group management pages |
| Vendor Pages | ${crawlData.pages.filter(p => p.category === 'Vendors').length} | Company/vendor pages |

### Data Quality
- Users with Email: ${crawlData.users.filter(u => u.email).length} (${Math.round(crawlData.users.filter(u => u.email).length / uniqueUsers.length * 100)}%)
- Users with Phone: ${crawlData.users.filter(u => u.phone).length} (${Math.round(crawlData.users.filter(u => u.phone).length / uniqueUsers.length * 100)}%)
- Complete Profiles: ${crawlData.users.filter(u => u.email && u.phone && u.company).length}

### Top Companies by User Count
${getTopCompaniesByUserCount()}

### Admin User Distribution
${getAdminDistribution()}

## Recommendations
1. **Data Completeness**: ${getDataCompletenessRecommendations()}
2. **Security Review**: ${getSecurityRecommendations()}
3. **Access Management**: ${getAccessRecommendations()}
`;
}

// Generate user distribution report
function generateUserReport() {
  const usersByCompany = {};
  crawlData.users.forEach(user => {
    const company = user.company || 'Unknown';
    if (!usersByCompany[company]) {
      usersByCompany[company] = [];
    }
    usersByCompany[company].push(user);
  });
  
  return `# User Distribution Report

Generated: ${new Date().toISOString()}

## User Distribution by Company

| Company | Total Users | Admin Users | Regular Users | Contact Completion |
|---------|-------------|-------------|---------------|-------------------|
${Object.entries(usersByCompany)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([company, users]) => {
    const admins = users.filter(u => u.isAdmin).length;
    const regular = users.length - admins;
    const complete = users.filter(u => u.email && u.phone).length;
    const completion = Math.round(complete / users.length * 100);
    return `| ${company} | ${users.length} | ${admins} | ${regular} | ${completion}% |`;
  })
  .join('\n')}

## User Details

### Admin Users
${crawlData.users
  .filter(u => u.isAdmin)
  .map(u => `- **${u.name}** (${u.company || 'Unknown'}) - ${u.email || 'No email'} - ${u.permissionTemplate}`)
  .join('\n')}

### Users Missing Contact Information
${crawlData.users
  .filter(u => !u.email || !u.phone)
  .slice(0, 20)
  .map(u => `- ${u.name} (${u.company || 'Unknown'}) - Missing: ${!u.email ? 'Email' : ''} ${!u.phone ? 'Phone' : ''}`)
  .join('\n')}

## Permission Templates Distribution
${getPermissionDistribution()}
`;
}

// Generate vendor report
function generateVendorReport() {
  return `# Vendor/Company Analysis Report

Generated: ${new Date().toISOString()}

## Company Overview

| Company Name | Type | User Count | Primary Contact |
|--------------|------|------------|-----------------|
${crawlData.vendors
  .sort((a, b) => (b.userCount || 0) - (a.userCount || 0))
  .map(vendor => {
    const users = crawlData.users.filter(u => u.company === vendor.name);
    const primaryContact = users.find(u => u.isAdmin) || users[0];
    return `| ${vendor.name} | ${vendor.type || 'Unknown'} | ${vendor.userCount || users.length} | ${primaryContact ? primaryContact.name : 'N/A'} |`;
  })
  .join('\n')}

## Company Type Distribution
${getCompanyTypeDistribution()}

## Companies Requiring Attention
${getCompaniesNeedingAttention()}
`;
}

// Generate permission report
function generatePermissionReport() {
  const permissionGroups = {};
  crawlData.users.forEach(user => {
    const template = user.permissionTemplate || 'Unknown';
    if (!permissionGroups[template]) {
      permissionGroups[template] = [];
    }
    permissionGroups[template].push(user);
  });
  
  return `# Permission Analysis Report

Generated: ${new Date().toISOString()}

## Permission Template Summary

| Permission Template | User Count | Percentage | Key Users |
|-------------------|------------|------------|-----------|
${Object.entries(permissionGroups)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([template, users]) => {
    const percentage = Math.round(users.length / crawlData.users.length * 100);
    const keyUsers = users.slice(0, 3).map(u => u.name).join(', ');
    return `| ${template} | ${users.length} | ${percentage}% | ${keyUsers}${users.length > 3 ? ', ...' : ''} |`;
  })
  .join('\n')}

## High-Privilege Users
${getHighPrivilegeUsers()}

## Permission Recommendations
${getPermissionRecommendations()}
`;
}

// Generate sitemap
function generateSitemap() {
  return `# Directory Crawl Sitemap

Generated: ${new Date().toISOString()}

## Summary Statistics
- Total Pages: ${crawlData.pages.length}
- Total Links Found: ${crawlData.pages.reduce((sum, p) => sum + p.links, 0)}
- Total Clickable Elements: ${crawlData.pages.reduce((sum, p) => sum + p.clickables, 0)}
- Total Dropdowns: ${crawlData.pages.reduce((sum, p) => sum + p.dropdowns, 0)}

## Page Directory

| Page Name | Category | Users/Vendors | Links | Clickables | Screenshot |
|-----------|----------|---------------|-------|------------|------------|
${crawlData.pages
  .sort((a, b) => a.category.localeCompare(b.category) || a.pageName.localeCompare(b.pageName))
  .map(page => {
    const dataCount = page.directoryData ? 
      (page.directoryData.users?.length || 0) + (page.directoryData.vendors?.length || 0) : 0;
    return `| ${page.pageName} | ${page.category} | ${dataCount} | ${page.links} | ${page.clickables} | [View](${page.screenshot}) |`;
  })
  .join('\n')}
`;
}

// Helper functions for report generation
function getTopCompaniesByUserCount() {
  const companies = {};
  crawlData.users.forEach(user => {
    const company = user.company || 'Unknown';
    companies[company] = (companies[company] || 0) + 1;
  });
  
  return Object.entries(companies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => `- ${company}: ${count} users`)
    .join('\n');
}

function getAdminDistribution() {
  const adminsByCompany = {};
  crawlData.users
    .filter(u => u.isAdmin)
    .forEach(user => {
      const company = user.company || 'Unknown';
      adminsByCompany[company] = (adminsByCompany[company] || 0) + 1;
    });
  
  return Object.entries(adminsByCompany)
    .sort((a, b) => b[1] - a[1])
    .map(([company, count]) => `- ${company}: ${count} admin(s)`)
    .join('\n');
}

function getDataCompletenessRecommendations() {
  const missingEmail = crawlData.users.filter(u => !u.email).length;
  const missingPhone = crawlData.users.filter(u => !u.phone).length;
  
  if (missingEmail > crawlData.users.length * 0.2) {
    return `${missingEmail} users (${Math.round(missingEmail / crawlData.users.length * 100)}%) are missing email addresses. Consider requiring email for all users.`;
  }
  return 'Contact information is generally complete.';
}

function getSecurityRecommendations() {
  const adminRatio = crawlData.users.filter(u => u.isAdmin).length / crawlData.users.length;
  if (adminRatio > 0.2) {
    return `High admin ratio detected (${Math.round(adminRatio * 100)}%). Review admin permissions.`;
  }
  return 'Admin user ratio appears appropriate.';
}

function getAccessRecommendations() {
  const templates = [...new Set(crawlData.users.map(u => u.permissionTemplate))];
  if (templates.length < 3) {
    return 'Limited permission templates in use. Consider implementing role-based access control.';
  }
  return 'Good variety of permission templates in use.';
}

function getPermissionDistribution() {
  const templates = {};
  crawlData.users.forEach(user => {
    const template = user.permissionTemplate || 'Unknown';
    templates[template] = (templates[template] || 0) + 1;
  });
  
  return Object.entries(templates)
    .sort((a, b) => b[1] - a[1])
    .map(([template, count]) => `- ${template}: ${count} users (${Math.round(count / crawlData.users.length * 100)}%)`)
    .join('\n');
}

function getCompanyTypeDistribution() {
  const types = {};
  crawlData.vendors.forEach(vendor => {
    const type = vendor.type || 'Unknown';
    types[type] = (types[type] || 0) + 1;
  });
  
  return Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `- ${type}: ${count} companies`)
    .join('\n');
}

function getCompaniesNeedingAttention() {
  const companiesNoUsers = crawlData.vendors.filter(v => !v.userCount || v.userCount === 0);
  if (companiesNoUsers.length > 0) {
    return companiesNoUsers
      .slice(0, 10)
      .map(v => `- ${v.name}: No active users`)
      .join('\n');
  }
  return 'All companies have active users.';
}

function getHighPrivilegeUsers() {
  return crawlData.users
    .filter(u => u.isAdmin)
    .slice(0, 10)
    .map(u => `- **${u.name}** - ${u.company || 'Unknown'} - ${u.email || 'No email'}`)
    .join('\n');
}

function getPermissionRecommendations() {
  const adminCount = crawlData.users.filter(u => u.isAdmin).length;
  const totalUsers = crawlData.users.length;
  const recommendations = [];
  
  if (adminCount > totalUsers * 0.15) {
    recommendations.push('- Consider reducing the number of admin users');
  }
  
  const usersWithoutCompany = crawlData.users.filter(u => !u.company).length;
  if (usersWithoutCompany > 0) {
    recommendations.push(`- ${usersWithoutCompany} users are not associated with a company`);
  }
  
  return recommendations.join('\n') || 'No immediate concerns identified.';
}

// Main crawl function
async function crawlDirectory() {
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Login
    console.log('Logging in to Procore...');
    await page.goto('https://app.procore.com/');
    await page.fill('input[name="user[email]"]', USERNAME);
    await page.fill('input[name="user[password]"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('Login successful!');
    
    // Start crawling from the main directory page
    const baseUrl = `https://us02.procore.com/${COMPANY_ID}/${PROJECT_ID}/project/directory`;
    const seedUrls = [
      `${baseUrl}/groups/users?page=1&per_page=150&search=&group_by=vendor.id&sort=vendor_name%2Cname`,
      `${baseUrl}/users`,
      `${baseUrl}/vendors`,
      `${baseUrl}/groups`
    ];
    
    const visited = new Set();
    const queue = [...seedUrls];
    
    // Crawl pages
    while (queue.length > 0 && visited.size < 50) {
      const url = queue.shift();
      
      if (visited.has(url)) continue;
      visited.add(url);
      
      const pageName = url.split('/').pop() || 'directory-home';
      const newUrls = await captureDirectoryPage(page, url, pageName);
      
      // Add new URLs to queue
      newUrls.forEach(newUrl => {
        if (!visited.has(newUrl) && newUrl.includes('/directory/')) {
          queue.push(newUrl);
        }
      });
    }
    
    // Capture some user profiles
    console.log('\nCapturing user profiles...');
    const usersToProfile = crawlData.users.slice(0, 10); // Limit to 10 for demo
    
    for (const user of usersToProfile) {
      if (user.profileUrl) {
        await captureUserProfile(page, user.profileUrl, user.name);
      }
    }
    
    // Capture filters and bulk actions
    await captureDirectoryFilters(page);
    
    // Generate reports
    await generateDirectoryReports();
    
    // Create README
    const readme = `# Procore Directory Documentation

Generated: ${new Date().toISOString()}

## Overview
This directory contains comprehensive documentation of the Procore project directory structure, including:
- User listings and profiles
- Company/vendor information
- Permission structures
- Contact information

## Contents
- \`pages/\` - Screenshots and data for each directory page
- \`user-profiles/\` - Individual user profile captures
- \`vendor-details/\` - Company detail pages
- \`reports/\` - Analysis reports and summaries
- \`directory-modals/\` - Filter and bulk action interfaces

## Key Statistics
- Total Pages Documented: ${crawlData.pages.length}
- Total Users Found: ${[...new Set(crawlData.users.map(u => u.id))].length}
- Total Companies: ${[...new Set(crawlData.vendors.map(v => v.id))].length}
- Admin Users: ${crawlData.users.filter(u => u.isAdmin).length}

## Reports
- [Directory Overview](reports/directory-overview.md) - Executive summary
- [User Distribution](reports/user-distribution.md) - Detailed user analysis
- [Vendor Analysis](reports/vendor-analysis.md) - Company breakdown
- [Permission Report](reports/permission-report.md) - Security analysis
- [Sitemap](reports/sitemap-table.md) - Complete page listing

## Usage
1. Start with the Directory Overview for high-level insights
2. Use the Sitemap to navigate to specific page captures
3. Reference the detailed reports for specific analyses
4. User profiles contain individual contact information
`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);
    
    console.log('\n✅ Directory crawl completed successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📊 Total pages captured: ${crawlData.pages.length}`);
    console.log(`👥 Total users found: ${[...new Set(crawlData.users.map(u => u.id))].length}`);
    console.log(`🏢 Total companies: ${[...new Set(crawlData.vendors.map(v => v.id))].length}`);
    
  } catch (error) {
    console.error('Error during crawl:', error);
  } finally {
    await browser.close();
  }
}

// Run the crawl
crawlDirectory();