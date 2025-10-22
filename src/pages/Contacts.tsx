import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, UserPlus } from "lucide-react";

const contacts = [
  { name: "John Doe", email: "john@example.com", status: "Active", lastContacted: "2024-03-15" },
  { name: "Jane Smith", email: "jane@example.com", status: "Active", lastContacted: "2024-03-14" },
  { name: "Bob Johnson", email: "bob@example.com", status: "Unsubscribed", lastContacted: "2024-03-10" },
  { name: "Alice Williams", email: "alice@example.com", status: "Active", lastContacted: "2024-03-12" },
  { name: "Charlie Brown", email: "charlie@example.com", status: "Bounced", lastContacted: "2024-03-08" },
  { name: "Diana Prince", email: "diana@example.com", status: "Active", lastContacted: "2024-03-13" },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage your email recipients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact List</CardTitle>
              <CardDescription>{contacts.length} total contacts</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Email Address</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Last Contacted</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-4 font-medium">{contact.name}</td>
                    <td className="py-4 text-muted-foreground">{contact.email}</td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        contact.status === "Active" ? "bg-green-100 text-green-800" :
                        contact.status === "Unsubscribed" ? "bg-gray-100 text-gray-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="py-4 text-muted-foreground">{contact.lastContacted}</td>
                    <td className="py-4">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
