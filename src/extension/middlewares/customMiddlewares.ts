export function customMiddleware(req: any, res: any, next: any) {
  console.log('Custom middleware executed!');
  next();
}

export const tblPrimaryKeys = new Map<string, string>([
  ["tblcategories", "CategoryID"],
  ["tblcategoryproducts", "CategoryProductID"]
]);


//export const TenantColumnName = "VendorID";
export const PortalInfo: any = {
  "TenantColumnName": "VendorID",
  "TenantInsertProc": "add_vendor",
  "PortalName": "VendorPortal"
}