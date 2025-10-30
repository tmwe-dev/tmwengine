/**
 * Header Email Management - Titolo e descrizione
 */

export function EmailManagementHeader() {
  return (
    <div className="fixed top-6 left-6 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
      <h2 className="text-2xl font-bold">📬 Email Management</h2>
      <p className="text-sm text-muted-foreground">
        Classifica i mittenti trascinandoli nei gruppi
      </p>
    </div>
  );
}
