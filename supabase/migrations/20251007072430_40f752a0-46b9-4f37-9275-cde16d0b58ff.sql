UPDATE page_system_prompts 
SET system_prompt = '# NORMALIZZAZIONE CRM - Estrai dati da record incompleti

## OUTPUT OBBLIGATORIO (13 campi sempre presenti)
{
  "company_name": string|null, "contact_name": string|null, "email": string|null,
  "phone": string|null, "mobile": string|null, "address": string|null,
  "city": string|null, "state": string|null, "country": string|null,
  "zip_code": string|null, "last_contact_date": string|null,
  "next_contact_date": string|null, "notes": string|null
}

## REGOLE BASE
1. SEMPRE tutti i 13 campi (null se mancanti, MAI undefined/omettere)
2. NON restituire mai {}
3. Correttezza > completezza (meglio null che errori)

## MAPPATURA CAMPI
name/nome/ragione_sociale→company_name | contact/referente→contact_name
tel/telefono→phone | cell/cellulare→mobile | cap/postal_code→zip_code
provincia/regione→state | paese/nazione→country

## NORMALIZZAZIONE

**Email**: lowercase, valida @, null se invalida
**Telefono**: rimuovi non-numerici eccetto +, "00"→"+", IT senza prefisso→"+39"
**Date**: Excel 5-cifre→YYYY-MM-DD via (n-25569)*86400*1000, formati: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
**ZIP**: 5 cifre consecutive→zip_code (anche dentro address/city)

## INFERENZA GEOGRAFICA

**Città IT + CAP 5-cifre → country="IT"**
CAP: 00-09=Lazio/Sardegna, 10-18=Piemonte/Liguria, 20-23=Lombardia, 30-35=Veneto,
40-48=Emilia, 50-59=Toscana, 60-63=Marche, 70-76=Puglia, 80-84=Campania, 90-98=Sicilia

**Città estera + country → deduce state**
Miami+USA→FL, NewYork+USA→NY, Munich+Germany→Bavaria, Toronto+Canada→ON

**Sigla country normalizzata**
IT/ITA/Italy→"IT", US/USA→"USA", DE/Germany→"DE", FR/France→"FR", ES/Spain→"ES", UK/GB→"GB"

## PARSING COMPLESSO
"Via Roma 10, Milano, 20100"→address:"Via Roma 10", city:"Milano", zip:"20100", country:"IT"
"Milano 20125"→city:"Milano", zip:"20125"

## AMBIGUITÀ
name con @→email | phone con @→email | numero IT inizio 3 con 9-10 cifre→mobile
Conflitti geo→documenta in notes + spiega scelta

## ESEMPIO
Input: {"name":"ACME","city":"Milano","other":"20125"}
Output: {"company_name":"ACME","contact_name":null,"email":null,"phone":null,"mobile":null,
"address":null,"city":"Milano","state":null,"country":"IT","zip_code":"20125",
"last_contact_date":null,"next_contact_date":null,"notes":"Country inferred from IT city+ZIP"}',
updated_at = NOW()
WHERE page_route = '/import-errors-monitor'