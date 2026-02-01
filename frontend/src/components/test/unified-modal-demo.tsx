"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/unified-modal"
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
  SlideoverDescription,
  SlideoverBody,
  SlideoverFooter,
  SlideoverTrigger,
} from "@/components/ui/unified-slideover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

export function UnifiedModalDemo() {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Unified Components Demo</h2>

      <div className="flex flex-wrap gap-4">
        {/* Small Modal */}
        <Modal>
          <ModalTrigger asChild>
            <Button variant="outline">Small Modal</Button>
          </ModalTrigger>
          <ModalContent size="sm">
            <ModalHeader>
              <ModalTitle>Small Modal Example</ModalTitle>
              <ModalDescription>
                This is a small modal with the unified design system.
              </ModalDescription>
            </ModalHeader>
            <div className="py-4">
              <p>Content goes here...</p>
            </div>
            <ModalFooter>
              <Button>Save</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Budget Line Item Modal - Horizontal Table Layout */}
        <Modal>
          <ModalTrigger asChild>
            <Button variant="outline">Add Budget Item</Button>
          </ModalTrigger>
          <ModalContent size="5xl">
            <ModalHeader>
              <ModalTitle>Add Budget Line Item</ModalTitle>
              <ModalDescription>
                Create a new budget line item for your project using the horizontal table format.
              </ModalDescription>
            </ModalHeader>
            <div className="py-6">
              <div className="bg-background border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground min-w-[300px]">
                          Budget Code*
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground w-24">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground w-28">
                          UOM
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground w-32">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-foreground w-32">
                          Amount*
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-muted">
                        <td className="px-4 py-3">
                          <Select>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Select budget code..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="01000.R">01000.R - General Requirements - Revenue</SelectItem>
                              <SelectItem value="02000.M">02000.M - Existing Conditions - Material</SelectItem>
                              <SelectItem value="03000.L">03000.L - Concrete - Labor</SelectItem>
                              <SelectItem value="04000.S">04000.S - Masonry - Subcontract</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="1.00"
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EA">EA - Each</SelectItem>
                              <SelectItem value="LS">LS - Lump Sum</SelectItem>
                              <SelectItem value="SF">SF - Square Foot</SelectItem>
                              <SelectItem value="LF">LF - Linear Foot</SelectItem>
                              <SelectItem value="HR">HR - Hour</SelectItem>
                              <SelectItem value="DAY">DAY - Day</SelectItem>
                              <SelectItem value="CY">CY - Cubic Yard</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="$0.00"
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="$0.00"
                            className="h-9 font-medium"
                            readOnly
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 border-t bg-muted">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <span className="text-lg">+</span>
                    Add Row
                  </Button>
                </div>
              </div>

              {/* Optional Notes Section */}
              <div className="mt-6">
                <Label htmlFor="line-item-notes">Notes (Optional)</Label>
                <Textarea
                  id="line-item-notes"
                  placeholder="Additional notes or specifications for this line item..."
                  rows={2}
                  className="mt-2"
                />
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Create Line Item</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* User Form Modal */}
        <Modal>
          <ModalTrigger asChild>
            <Button variant="outline">Add Team Member</Button>
          </ModalTrigger>
          <ModalContent size="lg">
            <ModalHeader>
              <ModalTitle>Add Team Member</ModalTitle>
              <ModalDescription>
                Add a new team member to your project.
              </ModalDescription>
            </ModalHeader>
            <div className="py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@company.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input id="job-title" placeholder="Project Manager" />
                </div>
              </div>

              <div>
                <Label htmlFor="company">Company</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alleato">Alleato Construction</SelectItem>
                    <SelectItem value="abc-contractors">ABC Contractors</SelectItem>
                    <SelectItem value="xyz-engineering">XYZ Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="permission">Permission Template</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project-manager">Project Manager</SelectItem>
                    <SelectItem value="superintendent">Superintendent</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="client-view-only">Client (View Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="send-invite" />
                <Label htmlFor="send-invite">Send invitation email</Label>
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Add Team Member</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Project Details Slideover */}
        <Slideover>
          <SlideoverTrigger asChild>
            <Button variant="outline">View Project Details</Button>
          </SlideoverTrigger>
          <SlideoverContent side="right" size="lg">
            <SlideoverHeader>
              <SlideoverTitle>Construction Project Alpha</SlideoverTitle>
              <SlideoverDescription>
                View and edit project information
              </SlideoverDescription>
            </SlideoverHeader>
            <SlideoverBody>
              <div className="space-y-6">
                {/* Project Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="default">Active</Badge>
                </div>

                {/* Project Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input id="project-name" value="Construction Project Alpha" />
                  </div>

                  <div>
                    <Label htmlFor="client">Client</Label>
                    <Input id="client" value="ABC Development Corp" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input id="start-date" type="date" value="2024-01-15" />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input id="end-date" type="date" value="2024-12-15" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Project Address</Label>
                    <Textarea id="address" rows={2} value="123 Construction Ave\nDowntown, CA 90210" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="budget">Total Budget</Label>
                      <Input id="budget" value="$2,450,000" />
                    </div>
                    <div>
                      <Label htmlFor="committed">Committed</Label>
                      <Input id="committed" value="$1,890,000" readOnly className="bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-3">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Active Tasks</div>
                      <div className="font-semibold">23</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Team Members</div>
                      <div className="font-semibold">8</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Open RFIs</div>
                      <div className="font-semibold">3</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">% Complete</div>
                      <div className="font-semibold">67%</div>
                    </div>
                  </div>
                </div>
              </div>
            </SlideoverBody>
            <SlideoverFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Save Changes</Button>
            </SlideoverFooter>
          </SlideoverContent>
        </Slideover>

        {/* Company Details Slideover */}
        <Slideover>
          <SlideoverTrigger asChild>
            <Button variant="outline">Company Details</Button>
          </SlideoverTrigger>
          <SlideoverContent side="right" size="md">
            <SlideoverHeader>
              <SlideoverTitle>ABC Contractors Inc.</SlideoverTitle>
              <SlideoverDescription>
                View company information and contacts
              </SlideoverDescription>
            </SlideoverHeader>
            <SlideoverBody>
              <div className="space-y-6">
                {/* Company Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" value="ABC Contractors Inc." readOnly className="bg-muted" />
                  </div>

                  <div>
                    <Label htmlFor="company-type">Company Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Subcontractor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" rows={3} value="456 Business Park Dr\nSuite 200\nCommerce, CA 90040" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value="(555) 987-6543" />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" value="www.abccontractors.com" />
                    </div>
                  </div>
                </div>

                {/* Key Contacts */}
                <div>
                  <h4 className="font-medium mb-3">Key Contacts</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium text-sm">Mike Johnson</div>
                        <div className="text-xs text-muted-foreground">Project Manager</div>
                      </div>
                      <Button variant="ghost" size="sm">Contact</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium text-sm">Sarah Chen</div>
                        <div className="text-xs text-muted-foreground">Site Supervisor</div>
                      </div>
                      <Button variant="ghost" size="sm">Contact</Button>
                    </div>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-3">Project History</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Contracts</span>
                      <span className="font-medium">$1,240,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projects Completed</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Projects</span>
                      <span className="font-medium">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </SlideoverBody>
            <SlideoverFooter>
              <Button variant="secondary">Close</Button>
              <Button>Edit Company</Button>
            </SlideoverFooter>
          </SlideoverContent>
        </Slideover>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-4">Unified Component Benefits:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Visual Consistency</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Standardized overlay: bg-black/60 + backdrop blur</li>
              <li>• Consistent close button placement</li>
              <li>• Unified border radius and shadows</li>
              <li>• Predictable spacing and typography</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Better UX</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Smooth animations (200ms zoom + fade)</li>
              <li>• Standard size variants (xs, sm, md, lg, xl)</li>
              <li>• Keyboard accessibility (ESC key)</li>
              <li>• Focus management</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded">
          <p className="text-sm text-warning">
            <strong>Try these examples:</strong> Notice how all overlays, animations, and interactions feel consistent across different content types.
          </p>
        </div>
      </div>
    </div>
  )
}