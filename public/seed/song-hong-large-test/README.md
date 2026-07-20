# Seed Test Case: Song Hong Bedding

Bo tai lieu mau de test mot du an chatbot tu van chan ga goi dem Song Hong o quy mo lon hon.

Muc tieu:
- Tao campaign moi tu tai lieu ban dau.
- Import catalog co san pham, gia theo bien the, anh san pham.
- Import FAQ/chinh sach va playbook tu van.
- Test update sau khi da co campaign: cap nhat gia va them san pham moi.
- Test chatbot tra loi co chu dich, gui anh, bao gia tham khao va xin lead.

Luu y ve du lieu:
- Day la seed synthetic cho demo/QA, khong phai bang gia chinh thuc de ban hang.
- Gia va anh duoc tong hop/paraphrase tu nguon public, can PM/Sale review truoc khi dung that.
- Bot chi duoc noi "gia tham khao theo catalog tai thoi diem test", khong cam ket khuyen mai con hieu luc.

Thu tu test de xuat:
1. Mo Import Center: /studio/import
2. Chon campaign dich hoac tao campaign moi trong /studio truoc.
3. Import lan 1 bang URL file `02-initial-catalog-products.txt`.
4. Import tiep `03-initial-faq-policies.txt` va `04-initial-sales-playbook.txt`.
5. Mo web chat `/chat/song-hong-demo?model=auto` de test cac prompt trong `test-prompts.md`.
6. Import file `05-update-price-and-new-products.txt` de test cap nhat gia va them san pham.

Nguon tham khao public:
- https://songhong.info/
- https://songhong.info/dem-song-hong-3-tam-vo-gam
- https://songhonghanoi.vn/
- https://demxanh.com/bang-gia-dem-bong-ep-song-hong-khuyen-mai.html
- https://songhongchinhhang.vn/
- https://khodemhanoi.vn/dem-bong-ep-song-hong-gia-bao-nhieu-do-day-va-kich-thuoc-dem-song-hong/

