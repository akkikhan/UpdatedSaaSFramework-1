# Page snapshot

```yaml
- generic [ref=e2]:
    - region "Notifications (F8)":
        - list
    - generic [ref=e3]:
        - generic [ref=e4]:
            - generic [ref=e6]:
                - img [ref=e8]
                - generic [ref=e12]:
                    - heading "SaaS Framework" [level=1] [ref=e13]
                    - paragraph [ref=e14]: Admin Portal
            - navigation [ref=e15]:
                - link "Dashboard" [ref=e16] [cursor=pointer]:
                    - /url: /
                    - img [ref=e17] [cursor=pointer]
                    - generic [ref=e20] [cursor=pointer]: Dashboard
                - link "Tenants" [ref=e21] [cursor=pointer]:
                    - /url: /tenants
                    - img [ref=e22] [cursor=pointer]
                    - generic [ref=e25] [cursor=pointer]: Tenants
                - link "RBAC Config" [ref=e26] [cursor=pointer]:
                    - /url: /rbac-config
                    - img [ref=e27] [cursor=pointer]
                    - generic [ref=e29] [cursor=pointer]: RBAC Config
                - link "Module Management" [ref=e30] [cursor=pointer]:
                    - /url: /modules
                    - img [ref=e31] [cursor=pointer]
                    - generic [ref=e34] [cursor=pointer]: Module Management
                - link "System Logs" [ref=e35] [cursor=pointer]:
                    - /url: /logs
                    - img [ref=e36] [cursor=pointer]
                    - generic [ref=e39] [cursor=pointer]: System Logs
                - link "Compliance" [ref=e40] [cursor=pointer]:
                    - /url: /compliance
                    - img [ref=e41] [cursor=pointer]
                    - generic [ref=e43] [cursor=pointer]: Compliance
                - link "SDK Integration" [ref=e44] [cursor=pointer]:
                    - /url: /sdk
                    - img [ref=e45] [cursor=pointer]
                    - generic [ref=e48] [cursor=pointer]: SDK Integration
                - link "Email Templates" [ref=e49] [cursor=pointer]:
                    - /url: /emails
                    - img [ref=e50] [cursor=pointer]
                    - generic [ref=e53] [cursor=pointer]: Email Templates
                - link "System Health" [ref=e54] [cursor=pointer]:
                    - /url: /system
                    - img [ref=e55] [cursor=pointer]
                    - generic [ref=e58] [cursor=pointer]: System Health
            - generic [ref=e60]:
                - generic [ref=e62]: PA
                - generic [ref=e63]:
                    - paragraph [ref=e64]: Platform Admin
                    - paragraph [ref=e65]: dev-saas@primussoft.com
        - generic [ref=e66]:
            - generic [ref=e68]:
                - generic [ref=e69]:
                    - heading "Dashboard" [level=2] [ref=e70]
                    - paragraph [ref=e71]:
                        Monitor your SaaS platform performance and manage
                        tenants
                - generic [ref=e75]: All Systems Operational
            - generic [ref=e78]:
                - generic [ref=e79]:
                    - heading "Tenant Onboarding" [level=1] [ref=e80]
                    - paragraph [ref=e81]:
                        Set up a new tenant with guided configuration
                - generic [ref=e82]:
                    - progressbar [ref=e83]
                    - generic [ref=e85]:
                        - generic [ref=e86]:
                            - img [ref=e88]
                            - generic [ref=e92]: Basic Information
                        - generic [ref=e93]:
                            - img [ref=e95]
                            - generic [ref=e97]: Select Modules
                        - generic [ref=e98]:
                            - img [ref=e100]
                            - generic [ref=e103]: Configure Modules
                        - generic [ref=e104]:
                            - img [ref=e106]
                            - generic [ref=e109]: Review & Create
                - generic [ref=e110]:
                    - generic [ref=e112]:
                        - generic [ref=e113]:
                            - generic [ref=e114]:
                                - img [ref=e115]
                                - text: Basic Information
                            - generic [ref=e119]:
                                Enter organization details and admin contact
                        - generic [ref=e121]:
                            - generic [ref=e122]:
                                - generic [ref=e123]:
                                    - generic [ref=e124]: Organization Name *
                                    - textbox "Organization Name *" [ref=e125]
                                    - paragraph [ref=e126]:
                                        The display name for this tenant
                                - generic [ref=e127]:
                                    - generic [ref=e128]: Organization ID *
                                    - textbox "Organization ID *" [ref=e129]
                                    - paragraph [ref=e130]:
                                        Unique identifier (lowercase, hyphens
                                        only)
                            - generic [ref=e131]:
                                - generic [ref=e132]:
                                    - generic [ref=e133]: Admin Name *
                                    - textbox "Admin Name *" [ref=e134]
                                    - paragraph [ref=e135]:
                                        Primary administrator's full name
                                - generic [ref=e136]:
                                    - generic [ref=e137]: Admin Email *
                                    - textbox "Admin Email *" [ref=e138]
                                    - paragraph [ref=e139]:
                                        Email for onboarding instructions
                            - generic [ref=e140]:
                                - generic [ref=e141]: Admin Password *
                                - textbox "Admin Password *" [ref=e142]
                                - paragraph [ref=e143]:
                                    Password for the admin user account
                            - generic [ref=e144]:
                                - generic [ref=e145]: Company Website (Optional)
                                - textbox "Company Website (Optional)"
                                  [ref=e146]
                                - paragraph [ref=e147]:
                                    Your organization's website URL
                            - generic [ref=e148]:
                                - ? checkbox "Send onboarding email" [checked]
                                    [ref=e149] [cursor=pointer]
                                  : - generic:
                                        - img
                                - checkbox [checked]
                                - generic [ref=e150]:
                                    - generic [ref=e151]: Send onboarding email
                                    - paragraph [ref=e152]:
                                        Send setup instructions and API keys to
                                        the admin email
                    - generic [ref=e153]:
                        - button "Back" [disabled]:
                            - img
                            - text: Back
                        - button "Next" [ref=e154] [cursor=pointer]:
                            - text: Next
                            - img
```
