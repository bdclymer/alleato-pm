# Procore Change Events

https://v2.support.procore.com/process-guides/about-change-events

## Overview

Designed to replace Procore's legacy budget modifications feature, the 'Budget Changes' concept provides your team with greater flexibility by eliminating the rigid data entry requirements associated with the legacy experience.

With this feature, users have the flexibility to configure the business logic that Procore uses to predict the Rough Order of Magnitude (ROM) impact of budget changes on your project's budget. For example, if you have an 'Out of Scope' budget change that will be adding revenue to your project, your team can tie the 'Budget ROM' value to 'Revenue.' Similarly, if you have an 'In Scope' budget change requiring you to add money to a work package from a contingency fund, you can also tie the 'Budget ROM' value to 'Cost.'

After creating a budget change, Procore also automatically creates a linked change event for you, so you can take advantage of Procore's change management feature. In addition, approved budget changes can be added to owner invoices.

Details
Key features include the ability to:

Configure ‘Budget ROM’ options in the 'Configure Settings' page of the project's Change Events tool

Add new source columns and create new calculated columns for use in a Procore Budget View

Create a new budget change that is automatically linked to a system-created change event from Procore's Budget tool

View budget change detail in the Budget tool

Create a budget change from a change event using the new 'Financial Impact' card

Extra columns on the Change Events table in the Line Items tab for participants in the Modernized Change Events beta program

Configure Change Event auto-creation from Budget Change in the 'Configure Settings' page of the Budget tool

Configure ‘Budget ROM’ options in the 'Configure Settings' page of the project's Change Events tool
Procore has a 'Budget ROM' section with three (3) drop-down lists for 'Budget ROM for In-Scope,' 'Budget ROM for Out of Scope,' and 'Budget ROM for TBD Scope.' These settings allow an administrator to define the business logic that Procore uses to automatically populate the 'Rough Order of Magnitude' value in the 'Budget ROM' column, which helps you gauge the impact of a given change on your project's budget. For each available Budget ROM scope, an administrator can choose from these options: Latest Cost, Latest Price, and None.

Example
Below are the new 'Budget ROM' configuration options in the 'Configure Settings' page of the Change Events tool.

Add new source columns and create new calculated columns for use in a Procore Budget View
Your company's Procore Administrator has the option to add new source columns and to use those columns to create new calculated columns, so you can view your budget change adjustments' impact in your project's Budget tool. To learn how to add these new columns, see Add the Columns for the Budget Changes Feature to a Budget View.

Example
Below is a look at how the columns appear when a budget view has been updated to include budget changes columns, and is assigned to the view in the project's Budget tool. To learn how to add these new columns, see Add the Columns for the Budget Changes Feature to a Budget.

Create a new budget change that is automatically linked to a system-created change event from Procore's Budget tool
Users can create new budget changes using the 'Create New Budget Change' page. After saving a new budget change, Procore automatically creates a new change event in the Change Events tool and links it to the budget change. You can also edit and delete budget changes from the project's Budget tool, as well as include an unlimited number of one- or multi-line item adjustments in each budget change. This is an efficient way to record both net-zero ($0) and/or non-net-zero ($0) changes in your budget.

Example
Below is the 'Create New Budget Change' page in the project's Budget tool.

Budget Change Add General Information

View budget change detail in the Budget tool
A detail pop-up window lets you view the details of your project's budget changes.

Example
Below is an example of the Budget Changes detail pop-up window in the Budget tool.

Create a budget change from a change event using the new 'Financial Impact' card
When creating a change event for a client contract, funding, or prime contract, you can now include the 'Budget ROM' financial impact for Out of Scope change events to show the latest impact on your project's budget.

Example
Below is the 'Financial Impact' card, included in the Create New Change Event page in the Change Events tool.

Extra columns on the Change Events table in the Line Items tab for participants in the Modernized Change Events beta program
When you create a budget change in the Budget tool, Procore adds an automatically-created change event line item that links to the budget change. There are also columns to the far right side of the change events table to show the 'Budget ROM,' 'Budget Change,' and the 'Latest Budget Impact' values for your change event line item(s). In addition, the value in the 'Budget ROM' column can be set to update the source for the column using an Automatic, Quantity x Unit Cost, or Manual entry.

Example
Below are the new 'Budget ROM,' 'Budget Change,' and the 'Latest Budget Impact' columns in the Change Events tool.

You can also edit the line to update the Budget ROM value using the options in the new 'Budget ROM Source' window.

Configure Change Event auto-creation from Budget Change in the 'Configure Settings' page of the Budget tool
This is a configuration setting on the Budget tool where users with admin permissions can "Require a Budget Change Adjustment to Change Event Association". With this setting enabled, Budget Changes will be required to have an associated Change Event.

Common Questions
Do we have to migrate to the budget changes feature?

How long can we continue to use budget modifications?

Do we need to update our API integration before migrating to budget changes?

Which API endpoints are being deprecated?

Can we sync budget changes with our integrated ERP system after the migration?

Can we sync budget modifications with our integrated ERP system after the migration?

Are there any other requirements?

How will a migration to budget changes affect reporting?

Do we have to migrate to the budget changes feature?
Yes. Procore's new Budget Changes feature was designed in response to user feedback and is a substantial upgrade to budget modifications. Procore is working with all customers to migrate their existing budget modifications data to the new budget changes format. Procore is providing customers with more than one (1) year to complete this migration process. Migration must be complete by a date yet to be determined.

How long can we continue to use budget modifications?
The new Budget Changes feature is designed to replace the existing budget modifications feature. Starting in October 2022, Procore will be working with Procore customers to migrate their existing budget modifications data to the new format required for the Budget Changes feature. Migration must be complete by a date yet to be determined. Once you complete this migration, you will no longer have access to the budget modifications feature. If you have any questions before your company starts the migration, contact your Procore point of contact.

To learn about the migration process, see Migrating to Budget Changes from Budget Modifications.

Do we need to update our API integration before migrating to budget changes?
Yes. Your Procore API endpoints will need to be updated as follows:

If you have a Procore-built ERP Integration, your API endpoints have already been updated to support the migration to the budget changes feature. If you have any questions about the migration, contact your Procore point of contact.

If you have a custom API integration built by Procore Technical Services, please do NOT perform the migration to budget changes on your own. To avoid unexpected results, it is important that you plan and schedule your migration to the budget changes feature. To schedule your migration, please send an email to apisupport@procore.com.

If you have developed an API integration on your own or with a third-party technology partner, you must update your integration’s API endpoints before you can start using the budget changes feature.

 Important
How much time do we have to update our API integrations to the new API? To support our customers in their long-range planning processes and to provide users with ample notice of this update requirement, Procore expects to sunset these legacy endpoints at a later date that is yet to be determined.

Which API endpoints are being deprecated?
Procore is notifying our customers now that the following endpoints are listed as deprecated in the Reference documentation on developers.procore.com. Procore expects to sunset these legacy endpoints in November of 2024:

List Budget Modifications - GET /rest/v1.0/projects/{project_id}/budget_modifications

Show Budget Modification - GET /rest/v1.0/projects/{project_id}/budget_modifications/{id}

Create Budget Modification - POST /rest/v1.0/projects/{project_id}/budget_modifications

Update Budget Modification - PATCH /rest/v1.0/projects/{project_id}/budget_modifications/{id}

Delete Budget Modification - DELETE /rest/v1.0/projects/{project_id}/budget_modifications/{id}

Can we sync budget changes with our integrated ERP system after the migration?
Yes. If you have a Procore-built integration and you have completed the migration process, you can sync budget changes with the ERP Integrations tool.

Can we sync budget modifications with our integrated ERP system after the migration?
No. If you have completed the migration process, you will no longer be able to sync your budget modifications data with the ERP Integrations tool.

Are there any other requirements?
Yes. The migration process also requires the users at your Company to use the modernized Change Events experience.

How will a migration to budget changes affect reporting?
If you have included budget modifications in your existing reports, you will need to be aware of the following:

Budget Snapshots

Budget modifications will continue to be available and reportable.

Budget changes will show once new snapshot(s) are created.

Enhanced Reporting for Financials. See Reports: Enhanced Reporting for Financials.

Budget modifications are removed.

Budget changes are included if users add a 'Budget Changes' column to their custom reporting view. See Set Up a Budget View for Custom Reporting.

Company and Project level Reports.

Budget modifications are removed.

Budget changes are NOT supported by your existing Company and Project level reports.

 Important
To preserve your historical budget modifications data, always download a copy of your reports before performing this migration.

If you have legacy reports that contain budget modification data, please note that you will need to recreate those reports if you want them to include budget changes. To quickly re-create those reports after the migration, it is recommended that you download your existing report(s) to use as a reference.

Procore Analytics

Budget modification dashboards will be hidden.

Budget changes dashboard will show historical data.

 Important
To update a custom Procore Analytics report after migrating your data, see Update a Custom Report When Migrating from Budget Modifications to Budget Changes.

How will data from my existing budget modifications show up in budget changes after migration?
Budget Modification Field (Legacy)

Budget Change Field (New)

To: Budget Code

Budget Change Adjustment # FROM Budget Change Adjustment Allocation Line Item

From: Budget Code

Budget Change Adjustment # TO Budget Change Adjustment Allocation Line Item

Notes

Comments field on the FIRST Budget Change Adjustment Line Item. Comments are not available on Budget Change Adjustment Allocation Line Items (subsequent line items).

Name: N/A (Field not available in legacy experience)

Name: 'Budget Change from Budget Modification Migration [ID Number]'

Description: N/A

Description: "Budget Change created from Budget Modification on [MIGRATION DATE/TIME]. Budget Modification originally created on [CREATION DATE/TIME]. Migration authorized by [ADMIN USERNAME]."

Change Event Line Item Association

Only budget modifications that are already associated with a change event line item will be connected to that change event line item as budget changes. No new associations will be created during the migration process.

Change Event Creation

New Change Events will NOT be created from Budget Modifications that do not have change event line item associations.

