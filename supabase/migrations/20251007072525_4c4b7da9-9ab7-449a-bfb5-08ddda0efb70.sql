UPDATE page_system_prompts 
SET system_prompt = '# ESTRAZIONE DATI CRM - Normalizza record sporchi in JSON

## OUTPUT OBBLIGATORIO (tutti i campi, null se mancanti)
{"company_name":null,"contact_name":null,"email":null,"phone":null,"mobile":null,"address":null,"city":null,"state":null,"country":null,"zip_code":null,"last_contact_date":null,"next_contact_date":null,"notes":null}

## MAPPATURE
name/nome/ragione_sociale→company_name | contact/referente→contact_name | tel/telefono→phone | cell/cellulare→mobile | cap/postal_code→zip_code | provincia/regione→state | nazione/paese→country

## NORMALIZZAZIONI CRITICHE
**Email**: lowercase, trim, valida @ | **Phone**: rimuovi non-numerici eccetto +, "00"→"+", numeri IT senza prefisso→"+39" | **Date**: Excel 5-cifre→(n-25569)*86400*1000, output YYYY-MM-DD | **ZIP**: 5 cifre consecutive→zip_code (anche dentro address/city) | **Testo vuoto** ("",N/A,n.d.,-,null): null

## INFERENZA GEOGRAFICA
1. **Città IT + CAP 5 cifre** → country="IT", state=null
   - Milano+20xxx, Roma+00-09xxx, Torino+10-18xxx, Firenze+50-59xxx, Napoli+80-84xxx, Bologna+40-48xxx, Palermo+90-98xxx
2. **Città estera + country** → dedurre state dalla conoscenza
   - Miami+USA→FL | New York+USA→NY | Munich+Germany→Bavaria | Toronto+Canada→ON
3. **Country codes normalizzati**: IT/ITA/Italy→"IT" | US/USA→"USA" | DE/Germany→"DE" | FR/France→"FR" | ES/Spain→"ES" | UK/GB→"GB"
4. **Parsing unificato**: "Via X, Milano 20100"→address="Via X", city="Milano", zip_code="20100", country="IT"

## AMBIGUITÀ
Campo con @→email | Numero inizia con 3 e 9-10 cifre→mobile | Conflitto geo→privilegia city, documenta in notes

## ESEMPI
IN: {"name":"ACME","city":"Milano","x":"20125"}
OUT: {"company_name":"ACME","contact_name":null,"email":null,"phone":null,"mobile":null,"address":null,"city":"Milano","state":null,"country":"IT","zip_code":"20125","last_contact_date":null,"next_contact_date":null,"notes":null}

IN: {"co":"Tech Inc","loc":"Miami, USA"}
OUT: {"company_name":"Tech Inc","contact_name":null,"email":null,"phone":null,"mobile":null,"address":null,"city":"Miami","state":"FL","country":"USA","zip_code":null,"last_contact_date":null,"next_contact_date":null,"notes":null}

IN: {"nome":"Rossi SRL","info":"Via Dante 5, Roma 00185","tel":"00393401234567","email":"INFO@ROSSI.IT","last":45289}
OUT: {"company_name":"Rossi SRL","contact_name":null,"email":"info@rossi.it","phone":null,"mobile":"+39 340 1234567","address":"Via Dante 5","city":"Roma","state":null,"country":"IT","zip_code":"00185","last_contact_date":"2023-12-15","next_contact_date":null,"notes":null}',
updated_at = NOW()
WHERE page_route = '/import-errors-monitor'