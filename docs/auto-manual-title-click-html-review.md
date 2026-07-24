# Auto = nhiều lần Manual trên Customily/Macorner

## Kết luận từ HTML hiện tại

Repo có fixture HTML Macorner tại `HTML/1 marconer.co.txt`. DOM thực tế của Macorner không phải danh sách option phẳng. Khu vực personalize nằm trong `#customily-options`, mỗi field là một `.customily_option`, title nằm trong `.option_name`, còn vùng mở/đóng accordion được điều khiển bởi `label[role="tab"]` có `aria-controls` trỏ tới `.cl-option-content`.

Vì vậy hướng đúng cho Macorner là: khi bấm **Auto**, extension phải chạy cùng luồng với **Manual** nhiều lần: lấy tất cả title Manual trong `#customily-options`, click đúng accordion tab của từng title để Customily render nội dung đang ẩn, đợi DOM settle, rồi gọi resolver Manual để đọc options từ chính `.customily_option` vừa mở.

## Vì sao Auto cũ chưa đạt yêu cầu

Auto V2 chỉ click giới hạn (`maxClicks`) và ưu tiên scan toàn trang. Với sản phẩm Customily động, một số nhóm chỉ có dữ liệu đầy đủ sau khi accordion tương ứng được mở. Kết quả là Auto có thể gom được ít/khác nhóm so với thao tác Manual nhiều lần.

Manual lại đúng hơn vì người dùng click từng title đang highlight; sau mỗi click, resolver đọc field đang được Customily mount/render ở DOM hiện tại. Do đó Auto cần được xem như bộ điều phối nhiều lượt Manual thay vì chỉ là scan toàn trang một lượt.

## Plan triển khai cụ thể

1. **Nhận diện Macorner Customily chính xác**
   - Host phải là `macorner.co` hoặc subdomain của nó.
   - Root phải là `#customily-options` và có ít nhất một `.customily_option`.
   - Title section như `PERSONALIZED` chỉ là tín hiệu phụ, không phải selector để lấy nhóm.

2. **Tạo candidate Manual-driven Auto ngay trong scanner profile Macorner**
   - Duyệt tất cả `.customily_option` trong root.
   - Lấy title bằng `.option_name` và cleanup các phần nhiễu như `Option n of m`, `(0|20)`, `*`, `Required`.
   - Trả về record có đủ `titleEl`, `groupEl`, `expandEl`, `label`, `source`.
   - `expandEl` phải là `label[role="tab"]`, `[role="tab"]`, hoặc `label[aria-controls]` gần nhất trong group; fallback mới dùng title.

3. **Auto chạy như nhiều click Manual**
   - `scanner-auto.js` đã ưu tiên Manual-driven Auto khi `hasManualDrivenAutoCandidatesLegacy()` có candidate.
   - Với Macorner, candidate hook mới bảo đảm route này được kích hoạt trước Auto V2/legacy.
   - Với mỗi candidate: scroll vào giữa màn hình, click `expandEl`, chờ DOM settle, gọi `collectManualGroupViaResolverLegacy(titleEl)`.

4. **Giữ kết quả cùng shape panel hiện tại**
   - Nhóm Manual được chuẩn hóa qua `mapV2GroupsToCategories()` để panel trái vẫn nhận `categories[].options[]` như các route Auto khác.
   - Dedup theo label + option keys để tránh trùng nhóm nếu DOM render lại cùng field.

5. **Không click vùng nguy hiểm**
   - Bỏ qua label/title chứa hành động như add to cart, checkout, upload, delete, quantity, payment.
   - Chỉ click title accordion personalize, không click nút mua hàng hoặc upload ảnh.

6. **Regression bắt buộc**
   - Test Macorner profile phải xác nhận candidate hook trả title sạch, đúng group, đúng accordion expand target và giữ scanPage hiện có.
   - Test Manual-driven Auto phải tiếp tục xác nhận Auto click nhiều title, đợi settle, gom nhiều groups, dedup, fallback khi không có group.

## Trạng thái repo sau cập nhật

- Macorner scanner profile hiện là nguồn chính cho cả Auto scan và Manual-driven Auto.
- Legacy `content_modules/manual_profiles/macorner.js` chỉ còn là compatibility shim cũ và không nên mở rộng thêm logic mới.
- Tài liệu cũ nói Auto nên dựa chủ yếu vào Auto V2/full-page scan cho Macorner không còn phù hợp; hướng chính hiện tại là Manual-driven Auto ưu tiên trước, Auto V2/legacy chỉ là fallback.
